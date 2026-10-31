
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <DHT.h>

// ---------- Wi-Fi ----------
const char* WIFI_NAME = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Laptop 1 ka IPv4 address yahan likho.
// Example address hai; apna actual address use karna.
const char* SERVER_URL =
  "http://192.168.1.10:5000/api/sensors";

// ---------- Pins ----------
#define SOIL_PIN A0
#define DHT_PIN D4
#define LDR_PIN D5
#define RELAY_PIN D1
#define DHT_TYPE DHT11

DHT dht(DHT_PIN, DHT_TYPE);

// Change this if your relay is active HIGH.
const bool RELAY_ACTIVE_LOW = true;

// ---------- Soil calibration ----------
// In example values ko apne sensor ke raw readings
// dekhkar calibrate karna.
const int SOIL_DRY_RAW = 850;
const int SOIL_WET_RAW = 400;

// Pump hysteresis thresholds
const int PUMP_ON_BELOW = 30;
const int PUMP_OFF_AT = 40;

bool pumpOn = false;
unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 3000;


void setPump(bool on) {
  pumpOn = on;

  if (RELAY_ACTIVE_LOW) {
    digitalWrite(RELAY_PIN, on ? LOW : HIGH);
  } else {
    digitalWrite(RELAY_PIN, on ? HIGH : LOW);
  }
}


int readSoilMoisture() {
  int raw = analogRead(SOIL_PIN);

  // Capacitive sensor mein aam taur par dry soil ka
  // raw value wet soil se zyada hota hai.
  int percent = map(
    raw,
    SOIL_DRY_RAW,
    SOIL_WET_RAW,
    0,
    100
  );

  percent = constrain(percent, 0, 100);

  Serial.print("Soil raw: ");
  Serial.print(raw);
  Serial.print(" | Moisture: ");
  Serial.print(percent);
  Serial.println("%");

  return percent;
}


void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_NAME, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("ESP8266 IP: ");
  Serial.println(WiFi.localIP());
}


void setup() {
  Serial.begin(115200);

  // Default OFF state; verify relay polarity before
  // connecting the pump's power supply.
  pinMode(RELAY_PIN, OUTPUT);
  setPump(false);

  pinMode(LDR_PIN, INPUT);

  dht.begin();
  connectWiFi();
}


void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.disconnect();
    WiFi.begin(WIFI_NAME, WIFI_PASSWORD);
    delay(1000);
    return;
  }

  if (millis() - lastSend < SEND_INTERVAL) {
    delay(20);
    return;
  }

  lastSend = millis();

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  int soilMoisture = readSoilMoisture();

  // Digital LDR module: LOW/HIGH indicates light/dark
  // depending on the module's comparator setting.
  int ldrState = digitalRead(LDR_PIN);
  int lightIntensity = (ldrState == HIGH) ? 1 : 0;

  // Hysteresis prevents rapid relay switching.
  if (soilMoisture < PUMP_ON_BELOW) {
    setPump(true);
  } else if (soilMoisture >= PUMP_OFF_AT) {
    setPump(false);
  }

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("DHT11 read failed; skipping upload.");
    return;
  }

  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;

    http.setTimeout(3000);

    if (http.begin(client, SERVER_URL)) {
      http.addHeader("Content-Type", "application/json");

      String payload = "{";
      payload += "\"temperature\":" + String(temperature, 1) + ",";
      payload += "\"humidity\":" + String(humidity, 1) + ",";
      payload += "\"soil_moisture\":" + String(soilMoisture) + ",";
      payload += "\"light_intensity\":" + String(lightIntensity) + ",";
      payload += "\"water_pump\":\"";
      payload += (pumpOn ? "ON" : "OFF");
      payload += "\"}";

      int httpCode = http.POST(payload);

      Serial.print("Upload HTTP code: ");
      Serial.println(httpCode);
      Serial.println(payload);

      if (httpCode < 0) {
        Serial.println(http.errorToString(httpCode));
      }

      http.end();
    } else {
      Serial.println("Could not start HTTP connection.");
    }
  }
}
