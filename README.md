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
	+ `CORS_ORIGIN`, `CORS_HEADERS`: for CORS configuration
	+ `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URIS`, `FOLDER_ID`, `SCOPES`: for Google Drive authentication and configuration
	+ `NOTION_AUTH`, `DATABASE_ID`, `PAGE_TAG`: for Notion authentication and configuration
	+ `CUDA`, `LLM_MODEL`, `WHISPER_MODEL`: for Whisper, and Llama3.1 configuration

**Environment Variables**
------------------------

* **CORS**: Configure CORS settings with `CORS_ORIGIN` and `CORS_HEADERS`.
* **Google Drive**: Authenticate with Google Drive using `CLIENT_ID`,
`CLIENT_SECRET`, `REDIRECT_URIS`, `FOLDER_ID`, and `SCOPES`.
* **Notion**: Authenticate with Notion using `NOTION_AUTH` and configure
the database ID with `DATABASE_ID`.
* **Variables**: Configure Whisper, Llama3.1, and Notion settings with
`CUDA`, `LLM_MODEL`, `WHISPER_MODEL`, and `PAGE_TAG`.

**Docker**
---------

This project is compatible with Docker. You can build a Docker image using
the provided `Dockerfile` and run it with your desired environment
variables.

**Installation**
---------------

1. Clone this repository: `git clone
https://github.com/V-Shadbolt/ai-voice-notes.git`
2. Install dependencies: `npm install`
3. Set environment variables in `.env` file or as Docker environment
variables using the `.env.example` or provided `docker-compose.yml`
4. Run the application using NodeJS: `node server.js`

**Example Use Cases**
---------------------

* Automate audio transcription and summarization for podcasts, interviews,
or meetings
* Create a centralized knowledge base by uploading transcripts and
summaries to Notion
* Integrate with other applications or services to create a seamless
workflow
