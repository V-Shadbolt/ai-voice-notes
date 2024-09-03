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
* A gguf LLM file in the /models directory. 
	+ For example: Meta-Llama-3.1-8B-Instruct.i1-Q4_K_M.gguf 
* A Google Service Account with associated credentials in the /auth directory.
	+ json should be titled `service.json`
  

**Environment Variables**
------------------------

*  **CORS**: Configure CORS settings with `CORS_ORIGIN` and `CORS_HEADERS`.
*  **Google Drive**: Authenticate with Google Drive using `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URIS`, `FOLDER_ID`, and `SCOPES`. 
	+ `CLIENT_ID`, `CLIENT_SECRET`, and `REDIRECT_URIS` can be ignored if using a service account
*  **Notion**: Authenticate with Notion using `NOTION_AUTH` and configure
the database ID with `DATABASE_ID`.
*  **Variables**: Configure Whisper, the LLM, and Notion settings with `CUDA`, `LLM_MODEL`, `WHISPER_MODEL`, and `PAGE_TAG`.

**Setting up Google Drive API**

***Finding Your Google Drive Folder ID***

To find your Google Drive folder ID:
1. Go to the Google Drive web interface and navigate to the folder you want to use.
2. Right-click on the folder (or press `Ctrl + C` on Windows or `Cmd + C` on Mac) to copy the link.
3. The link should be in the format `https://drive.google.com/drive/folders/...`. Copy the part that starts with `folders`.
4. Paste this into your environment variable `FOLDER_ID`.
5. Ensure your folder of choice is shared with the Google Service Account you will be using (follow the below to create a new service account)

***Setting up a Service Account for Google Drive API***

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project or select your existing project.
2. Navigate to the **APIs & Services** > **Dashboard** page and click on **Enable APIs and Services**.
3. Search for the **Google Drive API** and enable it.
4. Create credentials for your project by clicking on **Create Credentials** > **Service Account**.
5. Fill in the service account name and click on **done**.
6. Click on **Edit** beside the new service account and then click on **KEYS**.
7. Click on **ADD KEY** and select **Create new key**.
8. Select **JSON** and click **create**
9. Rename the downloaded JSON file as **service.json** and place it in the `/auth` folder.
10. Share the necessary Google Drive folder(s) with the newly created service account.


***Setting up OAuth2 for Google Drive API***

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project or select your existing project.
2. Navigate to the **APIs & Services** > **Dashboard** page and click on **Enable APIs and Services**.
3. Search for the **Google Drive API** and enable it.
4. Create credentials for your project by clicking on **Create Credentials** > **OAuth client ID**.
5. Choose **Other** as the application type and enter a authorized JavaScript origins (e.g., `http://localhost:3000`).
6. You will receive a `CLIENT_ID` and `CLIENT_SECRET`. Enter these into your environment variables.

**Setting up Notion API**

1. Go to the [Notion Web Interface](https://www.notion.so/) and sign in.
2. Navigate to [Notion Integrations Setting](https://www.notion.so/profile/integrations)
3. Click on **New Integration**, fill out the required details and save it
4. Click on **Configure integration settings**
5. Scroll down to the **Integration Secret** section and click on **Show**.
6. Copy the generated key into your environment variable `NOTION_AUTH`.
7. Note that you will also need to specify a database ID using `DATABASE_ID`. You can find this by navigating to the database where you want to upload content and copying the URL (e.g., `https://www.notion.so/...`). The part between the first `/` and the `?v=` is the database ID.
8. Note that you will need to enable your integration within your database. You can do this by navigating to your Notion Database, clicking the elipses in the top right corner, scolling down to the **Connections** section, clicking on **Conect to** and selecting your newly created integration. 

> Note: These instructions are subject to change. Please consult the official Google Drive API and Notion documentation for up-to-date information on setting up OAuth2 and creating a Notion API key. 

> Note: OAuth2 will expire every 7 days unless you approve your project with Google. Use a Service Account in place of OAuth2 if you do not want to use a frontend or to bypass the 7 day restriction.

**Docker**
---------

This project is compatible with Docker. You can build a Docker image using the provided `Dockerfile` and run it with your desired environment variables.

**Installation**
---------------
1. Clone this repository: `git clone https://github.com/V-Shadbolt/ai-voice-notes.git`
2. Install dependencies: `npm install` or `yarn install`
3. Set environment variables in `.env` file or as Docker environment variables using the `.env.example` or provided `docker-compose.yml`
4. Run the application using NodeJS: `node server.js` or `yarn start`

**Usage**
---------------
1. Go to `http://localhost:3000/auth` to authenticate the app with Google's OAuth2
2. You will be redirected to `http://localhost:3000/changes` 
3. Refresh `http://localhost:3000/changes` after uploading audio / video files to the specified Google Drive folder

> Note: A webhook implementation is in the works to avoid needing to manually refresh the page.

> Note: Any files uploaded before the first run of this script will be ignored.

**Example Use Cases**
---------------------
* Automate audio transcription and summarization for podcasts, interviews, or meetings
* Create a centralized knowledge base by uploading transcripts and summaries to Notion
* Integrate with other applications or services to create a seamless workflow