**AI Voice Notes**
================

**Description**
---------------
A NodeJS application that automates the process of downloading new files from a specific Google Drive folder, transcribing them using a local version of OpenAI's Whisper AI, summarizing and identifying other metadata from the resulting transcript with an LLM, and uploading the results to a Notion page.

> :warning: **This README was written by Llama3.1**: There may be inconsistencies!

**Features**
------------
* Downloads new files from a specified Google Drive folder
* Transcribes audio files using a locally running version of OpenAI's Whisper
* Summarizes transcripts using a locally running LLM such as Llama3.1
* Creates a Notion page and uploads the transcript(s), summaries, and other metadata to the page

**Requirements**
---------------
* NodeJS 18 or higher
* Docker (optional)
* Environment variables:
	+  `CORS_ORIGIN`, `CORS_HEADERS`: for CORS configuration
	+  `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URIS`, `FOLDER_ID`, `SCOPES`: for Google Drive authentication and configuration
	+  `NOTION_AUTH`, `DATABASE_ID`, `PAGE_TAG`: for Notion authentication and configuration
	+  `CUDA`, `LLM_MODEL`, `WHISPER_MODEL`: for Whisper, and Llama3.1 configuration

  

**Environment Variables**
------------------------

*  **CORS**: Configure CORS settings with `CORS_ORIGIN` and `CORS_HEADERS`.
*  **Google Drive**: Authenticate with Google Drive using `CLIENT_ID`,
`CLIENT_SECRET`, `REDIRECT_URIS`, `FOLDER_ID`, and `SCOPES`.
*  **Notion**: Authenticate with Notion using `NOTION_AUTH` and configure
the database ID with `DATABASE_ID`.
*  **Variables**: Configure Whisper, Llama3.1, and Notion settings with
`CUDA`, `LLM_MODEL`, `WHISPER_MODEL`, and `PAGE_TAG`.

**Setting up Google Drive API**

***Finding Your Google Drive Folder ID***

To find your Google Drive folder ID:
1. Go to the Google Drive web interface and navigate to the folder you want to use.
2. Right-click on the folder (or press `Ctrl + C` on Windows or `Cmd + C` on Mac) to copy the link.
3. The link should be in the format `https://drive.google.com/drive/folders/...`. Copy the part that starts with `folders/`.
4. Paste this into your environment variable `FOLDER_ID`.

***Setting up OAuth2 for Google Drive API***

To set up OAuth2:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
2. Navigate to the **APIs & Services** > **Dashboard** page and click on **Enable APIs and Services**.
3. Search for the **Google Drive API** and enable it.
4. Create credentials for your project by clicking on **Create Credentials** > **OAuth client ID**.
5. Choose **Other** as the application type and enter a authorized JavaScript origins (e.g., `http://localhost:3000`).
6. You will receive a `CLIENT_ID` and `CLIENT_SECRET`. Enter these into your environment variables.

**Setting up Notion API**

1. Go to the [Notion Web Interface](https://www.notion.so/) and sign in.
2. Click on your profile picture in the top right corner and select **Settings** from the dropdown menu.
3. Scroll down to the **API Keys** section and click on **Generate an API Key**.
4. Copy the generated key into your environment variable `NOTION_AUTH`.
5. Note that you will also need to specify a database ID using `DATABASE_ID`. You can find this by navigating to the page where you want to upload content and copying the URL (e.g., `https://www.notion.so/...`). The part that starts with `/pages/` is the page ID, which you can use as your `DATABASE_ID`.

> Note: These instructions are subject to change. Please consult the official Google Drive API and Notion documentation for up-to-date information on setting up OAuth2 and creating a Notion API key.

**Docker**
---------

This project is compatible with Docker. You can build a Docker image using the provided `Dockerfile` and run it with your desired environment variables.

**Installation**
---------------
1. Clone this repository: `git clone https://github.com/V-Shadbolt/ai-voice-notes.git`
2. Install dependencies: `npm install`
3. Set environment variables in `.env` file or as Docker environment variables using the `.env.example` or provided `docker-compose.yml`
4. Run the application using NodeJS: `node server.js`

**Example Use Cases**

---------------------
* Automate audio transcription and summarization for podcasts, interviews, or meetings
* Create a centralized knowledge base by uploading transcripts and summaries to Notion
* Integrate with other applications or services to create a seamless workflow