import express from 'express'
import fs from 'fs'
import { fileURLToPath } from "url";
import path from 'path'
import { google, drive_v3 } from 'googleapis'
import { v4 as uuid } from 'uuid'
import { nodewhisper } from 'nodejs-whisper'
import { getLlama, LlamaChatSession } from "node-llama-cpp";
import { Client } from '@notionhq/client'
import  { getAudioDurationInSeconds } from 'get-audio-duration'
import { getPrompt } from './helpers/prompt.js';
import { getGrammar } from './helpers/grammar.js';
import { createNotionPage, populateNotionPage } from './helpers/notion.js';

// Configuration
const app = express()
const SCOPES = ['https://www.googleapis.com/auth/drive']
const PORT = 3000
const SUPPORT_ALL_DRIVES = true
const SUPPORT_TEAM_DRIVES = true
const INCLUDE_ITEMS_FROM_ALL_DRIVES = true;
const FOLDER_ID = '1K_6FLNo49uQZgHw_aWLhNBTHJ3QE5vxf'
const DATABASE_ID = '9fcf9c9d242f40389379839880db65e3'
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_PATH = path.join(__dirname, "token.json")
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json")
const START_PAGE_TOKEN_PATH = path.join(__dirname, "startpagetoken.json")
const TEMP_PATH = path.join(__dirname,"tmp","audio.")
const MODEL_PATH = path.join(__dirname,"models","Meta-Llama-3.1-8B-Instruct.i1-Q4_K_M.gguf")
const supportedMimes = ["mp3", "m4a", "wav", "mp4", "mpeg", "mpga", "webm"]
let oAuth2Client = null

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFileSync(TOKEN_PATH)
        const credentials = JSON.parse(content)
        return google.auth.fromJSON(credentials)
    } catch (err) {
        return null
    }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
    const content = await fs.readFileSync(CREDENTIALS_PATH)
    const keys = JSON.parse(content)
    const key = keys.installed || keys.web
    
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    })

    await fs.writeFileSync(TOKEN_PATH, payload)
}

/**
 * Load or request for authorization to call APIs.
 *
 * @return {Promise<Array>}
 */
async function authorize() {
    oAuth2Client = await loadSavedCredentialsIfExist()
    if (oAuth2Client) {
        oAuth2Client.on('tokens', async (tokens) => {
            if (tokens.refresh_token) {
                await saveCredentials(oAuth2Client)
            }
        })
        return [oAuth2Client, null]
    }

    const content = await fs.readFileSync(CREDENTIALS_PATH)
    const keys = JSON.parse(content)
    const key = keys.installed || keys.web

    oAuth2Client = new google.auth.OAuth2(key.client_id, key.client_secret, key.redirect_uris);
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        include_granted_scopes: true
    });
    return [null, authUrl]
}

/**
 * Reads previously stored startPageToken from the save file.
 *
 * @return {Promise<Array|null>}
 */
async function loadStartPageTokenIfExist() {
    try {
        const content = await fs.readFileSync(START_PAGE_TOKEN_PATH)
        const keys = JSON.parse(content)
        const token = keys.startPageToken
        const date = keys.date
        return [token, date]
    } catch (err) {
        return null
    }
}

/**
 * Serializes startPageToken and token date to a file.
 *
 * @param {Number} token
 * @param {string} date
 * @return {Promise<void>}
 */
async function saveStartPageToken(token, date) {
    const payload = JSON.stringify({
        startPageToken: token,
        date: date
    })
  
    await fs.writeFileSync(START_PAGE_TOKEN_PATH, payload)
}

/**
 * Load or request or startPageToken to track changes.
 * 
 * @param {drive_v3.Drive} drive
 * @return {Promise<Array>}
 */
async function startPageToken(drive) {
    let token = await loadStartPageTokenIfExist()
    if (token) {
        return [token[0], token[1]]
    }
    const response_sp = await drive.changes.getStartPageToken()
    token = response_sp?.data?.startPageToken
    date = new Date().toISOString()
    if (token) {
      await saveStartPageToken(token, date)
    }

    return [token, date]
}

/**
 * Authorize Google Drive API.
 *
 * @return {Promise<drive_v3.Drive>}
 */
async function getDrive() {
    const auth = await authorize()
    const drive = google.drive({
        version: 'v3',
        auth: auth[0],
    })

    return drive
}

/**
 * Download new file to tmp.
 * 
 * @param {drive_v3.Drive} drive
 * @param {drive_v3.Schema$File} file
 * @return {Promise<void>}
 */
async function getFile(drive, file) {
    const download = await drive.files.get({
        fileId: file?.id,
        alt: 'media',
    })
    const fileBlob = download?.data
    fileBlob.lastModifiedDate = new Date();
    fileBlob.name = file?.name;
    const buffer = Buffer.from( await fileBlob.arrayBuffer() )
    await fs.writeFileSync(TEMP_PATH+file?.fileExtension, buffer)
    console.log(`Downloaded ${file?.name}`)
}

/**
 * Delete tmp file.
 * 
 * @param {drive_v3.Schema$File } file
 * @return {Promise<void>}
 */
async function deleteFile(file) {
    fs.unlink(TEMP_PATH+file?.fileExtension,function(err){
        if(err) return console.log(err);
        console.log(`${file?.name} deleted successfully`);
   })
}


/**
 * Authorization endpoint to instantiate OAuth2
 */
app.get('/auth', async (req, res) => {
    const url = await authorize()
    if (typeof url[1] === 'string' || url instanceof String) {
        res.redirect(url[1])
    } else {
        res.redirect('/changes')
    }
});

/**
 * Callback endpoint from OAuth2
 */
app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    try {
        // Set OAuth2 Credentials
        const {tokens} = await oAuth2Client.getToken(code);
        await oAuth2Client.setCredentials(tokens);
        if (oAuth2Client.credentials){
            await saveCredentials(oAuth2Client)
        }
        console.log('Authentication successful!')

        // TO_DO Register Webhook to watch for changes
        /*
        const drive = await getDrive()
        const pageToken = await startPageToken(drive)
        const lastCheck = pageToken[1]
        const startToken = pageToken[0]
        const channelId = uuid.v4();

        const requestBody = {
            kind: "api#channel",
            type: "webhook",
            address: 'http://localhost:3000/changes',
            id: channelId,
          };
        const response_watch = await drive.files.watch({
            q: `"${FOLDER_ID}" in parents and mimeType != "application/vnd.google-apps.folder" and trashed = false`,
            pageToken: startToken,
            supportsAllDrives: SUPPORT_ALL_DRIVES,
            supportsTeamDrives: SUPPORT_TEAM_DRIVES,
            includeItemsFromAllDrives: INCLUDE_ITEMS_FROM_ALL_DRIVES,
            requestBody: requestBody,
        })
        */

        // Placeholder for webhook callback endpoint
        setTimeout(function() {
            res.redirect('/changes');
        }, 5000)
    } catch (error) {
        console.error('Error authenticating:', error);
        res.status(500).send('Authentication failed.');
    }
});


/**
 * Webhook callback endpoint for any file changes in My Drive
 */
app.get('/changes', async (req, res) => {
    res.send('Hook recieved')
    try {
        console.log("Checking for new files.")
        const drive = await getDrive()
        const pageToken = await startPageToken(drive)
        const lastCheck = pageToken[1]
        const startToken = pageToken[0]
        
        const response_changes = await drive.files.list({
            q: `"${FOLDER_ID}" in parents and mimeType != "application/vnd.google-apps.folder" and createdTime > "${lastCheck}" and trashed = false`,
            orderBy: "createdTime desc",
            fields: "*",
            pageSize: 500,
        })
        
        if (response_changes?.data?.files?.at(-1)) {
            console.log(`Found ${response_changes?.data?.files.length} new files.`)
            
            const lastItem = await drive.files.get({
                fileId: response_changes.data.files.at(-1)?.id || undefined,
                fields: "createdTime",
            });
            
            const date = lastItem?.data?.createdTime;
            if (date) {
                await saveStartPageToken(response_changes?.data?.newStartPageToken || startToken, date)
                console.log("Saved new check date from files")
            }
            for (const file of response_changes?.data?.files) {
                console.log(`Working on ${file?.name}`)
                if (supportedMimes.includes(file?.fileExtension) && file?.size < 200000000) {
                    try {
                        // download gdrive file
                        const readableFileSize = file?.size / 1000000;
                        const size = `${readableFileSize.toFixed(2)}mb`
                        await getFile(drive, file)

                        let duration
                        try {
                            console.log("Transcribing...")
                            await nodewhisper(TEMP_PATH+file?.fileExtension, {
                                modelName: 'small',
                                autoDownloadModelName: 'small',
                                removeWavFileAfterTranscription: false,
                                whisperOptions: {
                                    outputInText: true,
                                },
                            })
                            const audioFile = {
                                name: "audio.wav",
                                fileExtension: "wav",
                            }
                            const seconds = await getAudioDurationInSeconds(TEMP_PATH+audioFile?.fileExtension)
                            duration = Math.round(seconds)
                            console.log("Transcribed Successfully")
                            await deleteFile(audioFile)
                        } catch (error) {
                            throw new Error(`Failed to transcribe file: ${error.message}`);
                        }
                        
                        // remove gdrive file
                        await deleteFile(file)

                        // Load and format transcript into prompt
                        const transcriptionFile = {
                            name: "audio.wav.txt",
                            fileExtension: "wav.txt",
                        }
                        const rawTranscript = fs.readFileSync(TEMP_PATH+transcriptionFile.fileExtension, 'utf8');
                        const transcript = rawTranscript.replace(/[\n\r]/g, "").replace(/ *(BLANK_AUDIO)*[\[\]]/g, "").trim()
                        const prompt = getPrompt(transcript, new Date().toISOString())

                        // delete transcription file
                        await deleteFile(transcriptionFile)

                        // Summarize formatted transcript with LLM prompt
                        let chatResponse
                        try {
                            console.log("Summarizing...")
                            const llama = await getLlama()
                            const model = await llama.loadModel({
                                modelPath: MODEL_PATH
                            })
                            const grammar = await getGrammar(llama)
                            const context = await model.createContext()
                            const session = new LlamaChatSession({
                                contextSequence: context.getSequence()
                            })
                            const a1 = await session.prompt(prompt, {grammar, maxTokens: context.getAllocatedContextSize()})
                            
                            chatResponse = JSON.parse(a1)
                            console.log("Summarized Successfully")
                        } catch (error) {
                            throw new Error(`Failed to summarize transcript: ${error.message}`);
                        }

                        chatResponse.url = file?.webViewLink
                        chatResponse.duration = duration
                        chatResponse.tag = "AI Transcription"
                        chatResponse.size = size

                        // Create Notion page and Upload chat response
                        try {
                            console.log("Creating Notion page...")
                            const notion = new Client({
                                auth: 'secret_WYh2TsICtuGWu3NjohHhHDLBHknLsBhdiRBwPioMRkx',
                            })
                            const page = await createNotionPage(notion, DATABASE_ID, chatResponse)
                            const transcriptSentences = transcript.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|")
                            await populateNotionPage(notion, page, chatResponse, transcriptSentences)
                            console.log("Notion page created successfully")
                        } catch (error) {
                            throw new Error(`Failed to create Notion Page: ${error.message}`);
                        }
                    
                    } catch (error) {
                        console.log(`Failed to parse "${file?.name}": ${error.message}`)
                        continue
                        /*
                        throw new Error(`Failed to parse "${file?.name}": ${error.message}`);
                        */
                    }
                } else {
                    console.log(`"${file?.name}" is too large. Files must be under 200mb and one of the following file types: ${supportedMimes.join(", ")}.`)
                    continue
                    /*
                    throw new Error(
                        `"${file?.name}" is too large. Files must be under 200mb and one of the following file types: ${supportedMimes.join(", ")}.`
                    )
                    */
                }
            }
        } else {
            await saveStartPageToken(response_changes?.data?.newStartPageToken || startToken, new Date().toISOString())
            console.log("No new files. Saved new check date")
        }
    } catch (error) {
        console.log('General hook error:', error);
        if (error.message.includes("invalid_grant") || error.message.includes("API key")) {
            fs.unlink(TOKEN_PATH,function(err){
                if(err) return console.log(err);
            })
            res.redirect('/auth')
        } else {
            //res.status(500).json({ error: 'Failed to parse files' });
        }
    }

})


/**
 * Start server
 */
app.listen(PORT, (error) =>{
    if(!error)
        console.log("Server is listening on port "+ PORT)
    else 
        console.log("Error occurred, server can't start", error);
    }
)
