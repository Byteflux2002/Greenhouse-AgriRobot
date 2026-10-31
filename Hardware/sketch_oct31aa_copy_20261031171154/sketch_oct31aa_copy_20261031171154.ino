#include <SoftwareSerial.h>

// HC-05 Bluetooth serial pins
// Arduino D2 receives HC-05 TXD
// Arduino D3 transmits to HC-05 RXD through a voltage divider
SoftwareSerial bluetooth(2, 3);

// L298N motor driver pins
const int IN1 = 8;
const int IN2 = 9;
const int IN3 = 10;
const int IN4 = 11;

char command = 'S';

unsigned long lastCommandTime = 0;
const unsigned long STOP_TIMEOUT = 1000; // stop if commands stop arriving

void stopCar() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
}

void forwardCar() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void backwardCar() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void leftCar() {
  // One side forward, the other side backward
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
}

void rightCar() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
}

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  stopCar();

  Serial.begin(9600);
  bluetooth.begin(9600);

  lastCommandTime = millis();

  Serial.println("RC car ready. Commands: F B L R S");
}

void loop() {
  if (bluetooth.available()) {
    char received = bluetooth.read();

    // Ignore line endings sent by the Flask backend
    if (received == '\r' || received == '\n') {
      return;
    }

    command = received;
    lastCommandTime = millis();

    switch (command) {
      case 'F':
      case 'f':
        forwardCar();
        Serial.println("FORWARD");
        break;

      case 'B':
      case 'b':
        backwardCar();
        Serial.println("BACKWARD");
        break;

      case 'L':
      case 'l':
        leftCar();
        Serial.println("LEFT");
        break;

      case 'R':
      case 'r':
        rightCar();
        Serial.println("RIGHT");
        break;

      case 'S':
      case 's':
        stopCar();
        Serial.println("STOP");
        break;

      default:
        stopCar();
        Serial.println("Unknown command - STOP");
        break;
    }
  }

  // Safety timeout: stop if no new command arrives
  if (millis() - lastCommandTime > STOP_TIMEOUT) {
    stopCar();
  }
}
