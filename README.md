# Detection of Mental Disorders

![GitHub Release](https://img.shields.io/github/v/release/Ekam-Bitt/Detection-of-Mental-Disorders-Extension)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/Ekam-Bitt/Detection-of-Mental-Disorders-Extension/docker-build.yml?label=build)
![GitHub License](https://img.shields.io/github/license/Ekam-Bitt/Detection-of-Mental-Disorders-Extension)

A privacy-focused browser extension that analyzes text content on web pages to detect emotional states and potential mental health indicators. Powered by a custom fine-tuned RoBERTa model.

## 📥 Getting Started

### 1. Get the Code

You need the full project code to run both the backend server and the extension.

- **Option A: Git (Recommended)**

  ```bash
  git clone https://github.com/Ekam-Bitt/Detection-of-Mental-Disorders-Extension.git
  cd Detection-of-Mental-Disorders-Extension
  ```

- **Option B: No Git**
  1.  Go to the **[Latest Release](https://github.com/Ekam-Bitt/Detection-of-Mental-Disorders-Extension/releases/latest)**.
  2.  Download the **Source code (zip)** (at the bottom of the assets list).
  3.  Unzip the file and open the folder.

### 2. Start the Backend

The extension relies on a local backend server to process data.

```bash
docker compose up --build
```

_Note: On the first run, it will download the ML model (~500MB) from Hugging Face._

### 3. Load the Extension

1.  Open Chrome and go to `chrome://extensions/`.
2.  Enable **Developer mode** (top right).
3.  Click **Load unpacked**.
4.  Select the `extension` folder from the project directory.

## 🚀 Features

- **Platform Support**: Specifically optimized for analyzing comments on **YouTube**, **Reddit**, and **X (Twitter)**.
- **Privacy First**: All analysis is done via a secure backend API; no data is stored permanently.
- **7 Emotion Categories**: Detects ADHD, Anxiety, Autism, BPD, Depression, PTSD, and Normal/Neutral states.
- **Visual Insights**: Displays a breakdown of detected emotions in a clean, easy-to-read chart.
- **Shield Mode**: Automatically blurs toxic or distressing comments based on a customizable toxicity threshold. Click blurred comments to reveal them temporarily.

## 🛠️ Tech Stack

- **Frontend (Extension)**: HTML, CSS, JavaScript (Manifest V3)
- **Backend (API)**: Python, Flask, Gunicorn
- **ML Model**: RoBERTa (Fine-tuned), hosted on [Hugging Face](https://huggingface.co/ekam28/emotion-detector)
- **Infrastructure**: Docker, Docker Compose

## 🖥️ Usage

1.  Navigate to a **YouTube** video, **Reddit** thread, or **X (Twitter)** post with comments.
2.  Click the **Detection of Mental Disorders** icon in your browser toolbar.
3.  The extension will analyze the visible text and display a pie chart of the detected emotions.

### 🛡️ Shield Mode

Shield Mode helps protect your mental well-being by automatically hiding comments that may contain toxic or distressing content.

1.  Enable **Shield Mode** using the checkbox in the extension popup.
2.  Adjust the **Toxicity Threshold** slider (0-100%):
    - **Lower values** = only very toxic comments are hidden
    - **Higher values** = more comments are hidden
3.  Comments with toxicity scores below the threshold appear blurred.
4.  Click any blurred comment to reveal it temporarily.

Settings persist across sessions.

## 🧠 Model Details

The core of this project is a custom fine-tuned RoBERTa model trained to classify text into the following categories:

| Label     | Condition                             |
| :-------- | :------------------------------------ |
| `LABEL_0` | ADHD                                  |
| `LABEL_1` | Anxiety                               |
| `LABEL_2` | Autism                                |
| `LABEL_3` | BPD (Borderline Personality Disorder) |
| `LABEL_4` | Depression                            |
| `LABEL_5` | PTSD                                  |
| `LABEL_6` | Normal                                |

You can view the model directly on Hugging Face: [ekam28/emotion-detector](https://huggingface.co/ekam28/emotion-detector)

## ⚠️ Disclaimer

This tool is for **educational and informational purposes only**. It is **NOT** a diagnostic tool and should not be used to diagnose mental health conditions. The results are based on statistical patterns in text and may not reflect the actual mental state of an individual.

## 📄 License

MIT License
