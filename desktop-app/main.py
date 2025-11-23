import sys
import requests
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout,
    QHBoxLayout, QLabel, QPushButton, QFileDialog,
    QTableWidget, QTableWidgetItem, QLineEdit,
    QListWidget, QMessageBox, QGroupBox, QHeaderView, QStatusBar
)
from PyQt5.QtCore import Qt
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure

# Base API URL, same as the React frontend
API_URL = 'https://chemical-backend-nghd.onrender.com/api' # When using locally 'http://127.0.0.1:8000/api';


# ----------------- LOGIN WINDOW ----------------- #

class LoginWindow(QWidget):
    def __init__(self, on_login_success):
        super().__init__()
        self.on_login_success = on_login_success

        self.setWindowTitle("Login - Chemical Visualizer")
        self.setGeometry(150, 150, 300, 160)

        layout = QVBoxLayout()

        self.username = QLineEdit(placeholderText="Username")
        self.password = QLineEdit(placeholderText="Password")
        self.password.setEchoMode(QLineEdit.Password)

        self.btn_login = QPushButton("Login")
        self.btn_login.clicked.connect(self.perform_login)

        layout.addWidget(QLabel("Enter Credentials"))
        layout.addWidget(self.username)
        layout.addWidget(self.password)
        layout.addWidget(self.btn_login)

        self.setLayout(layout)

    def perform_login(self):
        username = self.username.text().strip()
        password = self.password.text().strip()

        if not username or not password:
            QMessageBox.warning(self, "Error", "Username and password are required")
            return

        try:
            # Django REST Framework token auth endpoint
            resp = requests.post(
                f"{API_URL}/api-token-auth/",
                data={"username": username, "password": password}
            )
        except Exception as e:
            QMessageBox.critical(self, "Network Error", str(e))
            return

        if resp.status_code == 200:
            data = resp.json()
            token = data.get("token")
            if not token:
                QMessageBox.critical(self, "Error", "Token not found in response")
                return
            # Pass token and username back to main window starter
            self.on_login_success(token, username)
            self.close()
        else:
            QMessageBox.critical(
                self, "Login Failed",
                f"Status: {resp.status_code}\n{resp.text}"
            )


# ----------------- MAIN WINDOW ----------------- #

class MainWindow(QMainWindow):
    def __init__(self, token, username):
        super().__init__()
        self.token = token          # Store DRF token received after login
        self.username = username    # Store username for status bar

        self.setWindowTitle("Chemical Equipment Visualizer (Desktop)")
        self.setGeometry(100, 100, 1300, 800)

        # Attach a status bar for simple messages
        self.setStatusBar(QStatusBar())
        self.statusBar().showMessage(
            f"Logged in as {self.username}. Loading recent datasets..."
        )

        # This will store list endpoint data like React does
        self.dataset_cache = {}

        # Main layout for the whole window
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)

        # --- LEFT PANEL (controls and history) ---
        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)
        left_panel.setFixedWidth(300)

        # Upload section
        grp_upload = QGroupBox("Control Panel")
        upload_layout = QVBoxLayout()
        self.btn_upload = QPushButton("Upload New CSV")
        self.btn_upload.setStyleSheet(
            "background-color: #4F46E5; color: white; padding: 10px; font-weight: bold;"
        )
        self.btn_upload.clicked.connect(self.upload_csv)

        self.btn_refresh = QPushButton("Refresh List")
        self.btn_refresh.clicked.connect(self.load_history)

        upload_layout.addWidget(self.btn_upload)
        upload_layout.addWidget(self.btn_refresh)
        grp_upload.setLayout(upload_layout)

        # History list of recent uploads
        grp_history = QGroupBox("Recent Uploads")
        hist_layout = QVBoxLayout()
        self.list_history = QListWidget()
        self.list_history.itemClicked.connect(self.load_dataset_details)
        hist_layout.addWidget(self.list_history)
        grp_history.setLayout(hist_layout)

        # PDF report button
        self.btn_pdf = QPushButton("Download PDF Report")
        self.btn_pdf.setEnabled(False)
        self.btn_pdf.clicked.connect(self.download_pdf)

        left_layout.addWidget(grp_upload)
        left_layout.addWidget(grp_history)
        left_layout.addWidget(self.btn_pdf)
        left_layout.addStretch()

        # --- RIGHT PANEL (visualisation and table) ---
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)

        # Top row cards for summary statistics
        stats_layout = QHBoxLayout()
        self.lbl_count = self.create_stat_label("Total Units")
        self.lbl_flow = self.create_stat_label("Avg Flowrate")
        self.lbl_press = self.create_stat_label("Avg Pressure")
        self.lbl_temp = self.create_stat_label("Avg Temp")

        stats_layout.addWidget(self.lbl_count)
        stats_layout.addWidget(self.lbl_flow)
        stats_layout.addWidget(self.lbl_press)
        stats_layout.addWidget(self.lbl_temp)
        right_layout.addLayout(stats_layout)

        # Matplotlib area for charts
        self.figure = Figure(figsize=(5, 4), dpi=100)
        self.canvas = FigureCanvas(self.figure)
        right_layout.addWidget(self.canvas)

        # Small row above table for extra controls
        table_controls_layout = QHBoxLayout()
        self.btn_clear_table = QPushButton("Clear Table")
        self.btn_clear_table.clicked.connect(self.clear_table)
        table_controls_layout.addStretch()
        table_controls_layout.addWidget(self.btn_clear_table)
        right_layout.addLayout(table_controls_layout)

        # Data table for raw equipment data
        self.table = QTableWidget()
        right_layout.addWidget(self.table)

        main_layout.addWidget(left_panel)
        main_layout.addWidget(right_panel)

        self.current_dataset_id = None
        # Load history and auto-select latest dataset like React
        self.load_history(select_latest=True)

    # ------------- Helper methods ------------- #

    def create_stat_label(self, title):
        lbl = QLabel(f"{title}\n-")
        lbl.setAlignment(Qt.AlignCenter)
        lbl.setStyleSheet(
            """
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 8px;
            background: white;
            font-size: 12px;
            color: #111;         
            """ # would be visible on both desktop themes. (Dark or Light)
        )
        return lbl

    def _headers(self):
        """Prepare request headers including Authorization token."""
        headers = {}
        if self.token:
            headers["Authorization"] = f"Token {self.token}"
        return headers

    # ------------- API-related actions ------------- #

    def upload_csv(self):
        """Open file dialog, upload CSV to backend and refresh list."""
        fname, _ = QFileDialog.getOpenFileName(
            self, 'Open CSV', '.', "CSV Files (*.csv)"
        )
        if not fname:
            self.statusBar().showMessage("Upload cancelled.")
            return

        try:
            files = {'file': open(fname, 'rb')}
            r = requests.post(
                f"{API_URL}/datasets/",
                files=files,
                headers=self._headers()
            )
            if r.status_code == 201:
                QMessageBox.information(self, "Success", "File Uploaded Successfully")
                self.statusBar().showMessage("Upload successful. Refreshing list...")
                # After upload, reload history and automatically select the newest dataset
                self.load_history(select_latest=True)
            else:
                QMessageBox.critical(self, "Error", f"Upload failed: {r.text}")
                self.statusBar().showMessage("Upload failed.")
        except Exception as e:
            QMessageBox.critical(self, "Error", str(e))
            self.statusBar().showMessage("Error while uploading file.")

    def load_history(self, select_latest=False):
        """
        Fetch and show the latest 5 datasets in the list.
        If select_latest is True, also select the newest entry and load its details.
        """
        self.list_history.clear()
        self.dataset_cache = {}
        self.statusBar().showMessage(
            f"Logged in as {self.username}. Loading recent datasets..."
        )
        try:
            r = requests.get(f"{API_URL}/datasets/", headers=self._headers())
            if r.status_code == 200:
                data = r.json()

                # Sort by uploaded_at (newest first) and keep only five entries
                try:
                    data = sorted(
                        data,
                        key=lambda x: x.get('uploaded_at', ''),
                        reverse=True
                    )
                except Exception:
                    pass

                latest_five = data[:5]

                for item in latest_five:
                    ds_id = str(item['id'])
                    # Cache the full dataset object for later summary display
                    self.dataset_cache[ds_id] = item
                    self.list_history.addItem(
                        f"ID {ds_id} | {item['uploaded_at'][:16]}"
                    )

                if latest_five:
                    self.statusBar().showMessage(
                        f"Logged in as {self.username}. Recent datasets loaded."
                    )
                else:
                    self.statusBar().showMessage("No datasets found.")

                # On upload or first load, select the newest item and load details
                if select_latest and self.list_history.count() > 0:
                    first_item = self.list_history.item(0)
                    self.list_history.setCurrentItem(first_item)
                    self.load_dataset_details(first_item)

            else:
                QMessageBox.critical(
                    self, "Error", f"Failed to fetch history: {r.text}"
                )
                self.statusBar().showMessage("Failed to load dataset history.")
        except Exception as e:
            QMessageBox.critical(self, "Error", str(e))
            self.statusBar().showMessage("Error while loading dataset history.")

    def load_dataset_details(self, item):
        """When user clicks a dataset in the list, load its summary and raw data."""
        dataset_id = item.text().split(" | ")[0].replace("ID ", "")
        self.current_dataset_id = dataset_id
        self.btn_pdf.setEnabled(True)
        self.statusBar().showMessage(f"Loading dataset ID {dataset_id}...")

        # ---- 1. Use cached list data for summary (same as React) ----
        summary = self.dataset_cache.get(dataset_id)
        if summary:
            try:
                self.lbl_count.setText(f"Total Units: {summary['total_count']}")
                self.lbl_flow.setText(f"Avg Flowrate: {summary['avg_flowrate']:.1f}")
                self.lbl_press.setText(f"Avg Pressure: {summary['avg_pressure']:.1f}")
                avg_temp = summary.get('avg_temperature', None)
                if avg_temp is not None:
                    self.lbl_temp.setText(f"Avg Temp: {avg_temp:.1f}")
                else:
                    self.lbl_temp.setText("Avg Temp: -")
                self.plot_charts(summary['type_distribution'])
                self.statusBar().showMessage(f"Dataset ID {dataset_id} loaded.")
            except Exception as e:
                # If any key is missing, show a simple error
                QMessageBox.warning(self, "Warning", f"Summary data missing: {e}")
                self.statusBar().showMessage("Could not update summary from cache.")
        else:
            # Optional fallback: if not in cache, you can still try detail endpoint
            try:
                r = requests.get(
                    f"{API_URL}/datasets/{dataset_id}/",
                    headers=self._headers()
                )
                if r.status_code == 200:
                    data = r.json()
                    self.lbl_count.setText(f"Total Units: {data.get('total_count', '-')}")
                    avg_flow = data.get('avg_flowrate', None)
                    avg_press = data.get('avg_pressure', None)
                    avg_temp = data.get('avg_temperature', None)

                    self.lbl_flow.setText(
                        f"Avg Flowrate: {avg_flow:.1f}" if isinstance(avg_flow, (int, float)) else "Avg Flowrate: -"
                    )
                    self.lbl_press.setText(
                        f"Avg Pressure: {avg_press:.1f}" if isinstance(avg_press, (int, float)) else "Avg Pressure: -"
                    )
                    if isinstance(avg_temp, (int, float)):
                        self.lbl_temp.setText(f"Avg Temp: {avg_temp:.1f}")
                    else:
                        self.lbl_temp.setText("Avg Temp: -")

                    dist = data.get('type_distribution', {})
                    self.plot_charts(dist)
                    self.statusBar().showMessage(f"Dataset ID {dataset_id} loaded.")
                else:
                    QMessageBox.critical(
                        self, "Error", f"Failed to fetch summary: {r.text}"
                    )
                    self.statusBar().showMessage("Failed to load dataset summary.")
            except Exception as e:
                QMessageBox.critical(self, "Error", str(e))
                self.statusBar().showMessage("Error while loading dataset summary.")

        # ---- 2. Fetch raw row-level data for table ----
        try:
            r_raw = requests.get(
                f"{API_URL}/datasets/{dataset_id}/raw_data/",
                headers=self._headers()
            )
            if r_raw.status_code == 200:
                self.fill_table(r_raw.json())
                # Keep last summary message in status bar
            else:
                QMessageBox.critical(
                    self, "Error", f"Failed to fetch raw data: {r_raw.text}"
                )
                self.statusBar().showMessage("Failed to load raw data.")
        except Exception as e:
            QMessageBox.critical(self, "Error", str(e))
            self.statusBar().showMessage("Error while loading raw data.")

    def plot_charts(self, distribution):
        """Draw bar chart and pie chart for equipment type distribution."""
        self.figure.clear()

        if not distribution:
            self.canvas.draw()
            return

        # Subplot 1: bar chart for distribution
        ax1 = self.figure.add_subplot(121)
        ax1.bar(distribution.keys(), distribution.values(), color='#4F46E5')
        ax1.set_title("Equipment Distribution")
        ax1.tick_params(axis='x', rotation=45)

        # Subplot 2: pie chart for share
        ax2 = self.figure.add_subplot(122)
        ax2.pie(
            distribution.values(),
            labels=distribution.keys(),
            autopct='%1.1f%%',
            startangle=90
        )
        ax2.set_title("Type Share")

        self.canvas.draw()

    def fill_table(self, data):
        """Fill the table widget with raw equipment data."""
        if not data:
            return

        cols = ['Equipment Name', 'Type', 'Flowrate', 'Pressure', 'Temperature']
        self.table.setColumnCount(len(cols))
        self.table.setRowCount(len(data))
        self.table.setHorizontalHeaderLabels(cols)
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)

        for i, row in enumerate(data):
            for j, col in enumerate(cols):
                val = str(row.get(col, ""))
                self.table.setItem(i, j, QTableWidgetItem(val))

    def clear_table(self):
        """Clear the table contents and reset rows."""
        self.table.clearContents()
        self.table.setRowCount(0)
        self.statusBar().showMessage("Table cleared.")

    def download_pdf(self):
        """Open the PDF report for the selected dataset in the default browser."""
        if self.current_dataset_id:
            import webbrowser
            webbrowser.open(
                f"{API_URL}/datasets/{self.current_dataset_id}/generate_pdf/"
            )
            self.statusBar().showMessage(
                f"Opening PDF for dataset ID {self.current_dataset_id}..."
            )
        else:
            self.statusBar().showMessage("No dataset selected for PDF.")


# ----------------- ENTRY POINT ----------------- #

if __name__ == "__main__":
    app = QApplication(sys.argv)

    def start_main(token, username):
        global window
        window = MainWindow(token, username)
        window.show()

    login = LoginWindow(start_main)
    login.show()

    sys.exit(app.exec_())
