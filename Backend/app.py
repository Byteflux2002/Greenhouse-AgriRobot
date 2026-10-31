
from flask import Flask, jsonify, request
from flask_cors import CORS
import time

try:
    import serial
except ImportError:
    serial = None

app = Flask(__name__)
CORS(app)

# Change COM5 to your laptop's actual HC-05 COM port.
# Keep None until you have checked the correct port.
SERIAL_PORT = None
BAUD_RATE = 9600

arduino = None

if SERIAL_PORT and serial:
    try:
        arduino = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        time.sleep(2)  # Arduino may reset when serial connects
        print(f"Arduino connected on {SERIAL_PORT}")
    except Exception as e:
        print(f"Arduino not connected: {e}")

sensor_data = {
    "temperature": 28,
    "humidity": 65,
    "soil_moisture": 42,
    "light_intensity": 750
}

pump_state = False
robot_state = False
movement_state = "STOP"

# Dashboard commands -> Arduino single-character commands
COMMAND_MAP = {
    "FORWARD": "F",
    "BACKWARD": "B",
    "LEFT": "L",
    "RIGHT": "R",
    "STOP": "S"
}


def send_to_arduino(command):
    """Send one command to Arduino if Bluetooth serial is connected."""
    if arduino and arduino.is_open:
        arduino.write((command + "\n").encode("utf-8"))
        return True
    return False


def update_pump():
    global pump_state

    moisture = sensor_data["soil_moisture"]

    if moisture < 30:
        pump_state = True
    elif moisture >= 40:
        pump_state = False

    return pump_state


@app.route("/api/sensors", methods=["GET"])
def get_sensors():
    update_pump()
    return jsonify({
        **sensor_data,
        "water_pump": "ON" if pump_state else "OFF",
        "data_mode": "demo"
    })


@app.route("/api/robot", methods=["GET", "POST"])
def control_robot():
    global robot_state, movement_state

    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        command = str(data.get("command", "")).upper()

        if command == "ON":
            robot_state = True
        elif command == "OFF":
            robot_state = False
            movement_state = "STOP"
            send_to_arduino("S")
        else:
            return jsonify({"error": "Use ON or OFF"}), 400

    return jsonify({
        "robot": "ON" if robot_state else "OFF",
        "mode": "hardware" if arduino and arduino.is_open
                else "simulation",
        "serial_connected": bool(arduino and arduino.is_open)
    })


@app.route("/api/movement", methods=["GET", "POST"])
def control_movement():
    global movement_state

    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        command = str(data.get("command", "")).upper()

        if command not in COMMAND_MAP:
            return jsonify({
                "error": "Use FORWARD, BACKWARD, LEFT, RIGHT or STOP"
            }), 400

        if command != "STOP" and not robot_state:
            return jsonify({
                "error": "Turn robot ON first"
            }), 400

        movement_state = command
        sent = send_to_arduino(COMMAND_MAP[command])

        return jsonify({
            "movement": movement_state,
            "mode": "hardware" if sent else "simulation",
            "command_sent": sent
        })

    return jsonify({
        "movement": movement_state,
        "mode": "hardware" if arduino and arduino.is_open
                else "simulation"
    })


if __name__ == "__main__":
    app.run(debug=True)
