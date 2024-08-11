const express = require('express')
const fs = require('fs')
const path = require("path")
const { google, drive_v3 } = require('googleapis')
const uuid = require("uuid")

// Configuration
const app = express()
const SCOPES = ['https://www.googleapis.com/auth/drive']
const PORT = 3000
const SUPPORT_ALL_DRIVES = true
const SUPPORT_TEAM_DRIVES = true
const INCLUDE_ITEMS_FROM_ALL_DRIVES = true;
const FOLDER_ID = '1K_6FLNo49uQZgHw_aWLhNBTHJ3QE5vxf'
const TOKEN_PATH = path.join(__dirname, "token.json")
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json")
const START_PAGE_TOKEN_PATH = path.join(__dirname, "startpagetoken.json")
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
 * Serializes startPageToken to a file.
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
 * @return {Promise<Array>}
 */
async function startPageToken() {
    let token = await loadStartPageTokenIfExist()
    if (token) {
        return [token[0], token[1]]
    }
    const drive = await getDrive()
    const response_sp = await drive.changes.getStartPageToken()
    token = response_sp?.data?.startPageToken
    date = new Date().toISOString()
    if (token) {
      await saveStartPageToken(token, date)
    }

    return [token, date]
}

/**
 * Load or request or startPageToken to track changes.
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

app.get('/auth', async (req, res) => {
    const url = await authorize()
    if (typeof url[1] === 'string' || url instanceof String) {
        res.redirect(url[1])
    } else {
        res.redirect('/changes')
    }
});

// Handle the callback from the authentication flow
app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    try {
        const {tokens} = await oAuth2Client.getToken(code);
        await oAuth2Client.setCredentials(tokens);
        if (oAuth2Client.credentials){
            await saveCredentials(oAuth2Client)
        }
        console.log('Authentication successful! Registering webhook')

        const pageToken = await startPageToken()
        /*
        const channelId = uuid.v4();
        const requestBody = {
            kind: "api#channel",
            type: "webhook",
            address: 'http://localhost:3000/changes',
            id: channelId,
          };
        const response_watch = await drive.files.watch({
            q: `${FOLDER_ID} in parents`,
            pageToken: pageToken[0],
            supportsAllDrives: SUPPORT_ALL_DRIVES,
            supportsTeamDrives: SUPPORT_TEAM_DRIVES,
            includeItemsFromAllDrives: INCLUDE_ITEMS_FROM_ALL_DRIVES,
            requestBody: requestBody,
        })
        */

        res.redirect('/changes');
    } catch (error) {
        console.error('Error authenticating:', error);
        res.status(500).send('Authentication failed.');
    }
});

app.get('/files', async (req, res) => {
    try {
        const drive = await getDrive()
        const response = await drive.files.list({
            pageSize: 10, // Set the desired number of files to retrieve
            fields: 'files(name, id)', // Specify the fields to include in the response
        });
        const files = response.data.files;
        res.json(files);
        } catch (err) {
        console.error('Error listing files:', err);
        res.status(500).json({ error: 'Failed to list files' });
        }
  });

  app.get('/changes', async (req, res) => {
    try {
        const drive = await getDrive()
        const pageToken = await startPageToken()
        const lastCheck = pageToken[1];
        console.log(pageToken)
        
        const response_changes = await drive.files.list({
            q: `'${FOLDER_ID}' in parents`,// and modifiedTime > '${lastCheck}'`,
            //pageToken: pageToken[0],
            //supportsAllDrives: SUPPORT_ALL_DRIVES,
            //supportsTeamDrives: SUPPORT_TEAM_DRIVES,
            //includeItemsFromAllDrives: INCLUDE_ITEMS_FROM_ALL_DRIVES,
            pageSize: 500,
        })
        console.log(response_changes)
        if (response_changes?.data?.nextPageToken && response_changes?.data?.files?.at(-1)) {
            const lastItem = await drive.files.get({
                fileId: response.data.files.at(-1)?.id || undefined,
                fields: "createdTime",
            });
            const date = lastItem?.data?.createdTime;
            if (date) {
                await saveStartPageToken(response_changes?.data?.newStartPageToken, date)
            }
            
        } else {
            await saveStartPageToken(response_changes?.data?.newStartPageToken, new Date().toISOString())
            
        }
        res.send(JSON.stringify(response_changes?.data))
        //res.send(JSON.stringify(response_changes?.data?.changes))
    } catch (error) {
        console.log(error)
    }

  })

app.listen(PORT, (error) =>{
    if(!error)
        console.log("Server is listening on port "+ PORT)
    else 
        console.log("Error occurred, server can't start", error);
    }
)
