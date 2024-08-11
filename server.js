const express = require('express')
const fs = require('fs')
const path = require("path")
const {authenticate} = require('@google-cloud/local-auth')
const { google } = require('googleapis')
const uuid = require("uuid")
const router = express.Router();


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
 * @return {Promise<drive_v3.Drive>}
 */
async function authorize() {
    let client = await loadSavedCredentialsIfExist()
    if (client) {
        const drive = google.drive({
            version: 'v3',
            auth: client,
        })
        return drive
    }
    const content = await fs.readFileSync(CREDENTIALS_PATH)
    const keys = JSON.parse(content)
    const key = keys.installed || keys.web

    const oAuth2Client = new google.auth.OAuth2(key.client_id, key.client_secret, key.redirect_uris);
    /*
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    })
    */
    if (client.credentials) {
      await saveCredentials(client)
    }

    const drive = google.drive({
        version: 'v3',
        auth: client,
    })
    return drive
}

/**
 * Generate Auth URL.
 *
 * @return {Promise<string>}
 */
async function generateAuthUrl() {
    const content = await fs.readFileSync(CREDENTIALS_PATH)
    const keys = JSON.parse(content)
    const key = keys.installed || keys.web

    const oAuth2Client = new google.auth.OAuth2(key.client_id, key.client_secret, key.redirect_uris);

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        include_granted_scopes: true
    });
    
    return authUrl
}

/**
 * Reads previously stored startPageToken from the save file.
 *
 * @return {Promise<Number|null>}
 */
async function loadStartPageTokenIfExist() {
    try {
        const content = await fs.readFileSync(START_PAGE_TOKEN_PATH)
        const keys = JSON.parse(content)
        const token = keys.startPageToken
        return token
    } catch (err) {
        return null
    }
}

/**
 * Serializes startPageToken to a file.
 *
 * @param {Number} token
 * @return {Promise<void>}
 */
async function saveStartPageToken(token) {
    const payload = JSON.stringify({
        startPageToken: token,
    })
  
    await fs.writeFileSync(START_PAGE_TOKEN_PATH, payload)
}

/**
 * Load or request or startPageToken to track changes.
 *
 * @return {Promise<Number>}
 */
async function startPageToken() {
    let token = await loadStartPageTokenIfExist()
    if (token) {
        return token
    }
    const drive = await authorize()
    const response_sp = await drive.changes.getStartPageToken()
    token = response_sp?.data?.startPageToken
    if (token) {
      await saveStartPageToken(token)
    }

    return token
}

router.get('/auth', async (req, res) => {
    const url = await generateAuthUrl()
    res.redirect(url)
    //await authorize()
});

// Handle the callback from the authentication flow
router.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    try {
        const { tokens } = await oAuth2Client.getToken(code);
        const accessToken = tokens.access_token;
        const refreshToken = tokens.refresh_token;
        oAuth2Client.setCredentials({ refresh_token: refreshToken, access_token:accessToken });
        console.log('Authentication successful! Please return to the console.')
        res.redirect('/files');
    } catch (error) {
        console.error('Error authenticating:', error);
        res.status(500).send('Authentication failed.');
    }
});

app.get('/files', async (req, res) => {
    try {
      const drive = await authorize()
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
        const drive = await authorize()
        const pageToken = await startPageToken()
        /*
        const channelId = uuid.v4();
        const requestBody = {
            kind: "api#channel",
            type: "webhook",
            address: 'http://localhost:3000/hook',
            id: channelId,
          };
*/
        const response_changes = await drive.changes.list({
            fileId: FOLDER_ID,
            pageToken: pageToken,
            supportsAllDrives: SUPPORT_ALL_DRIVES,
            supportsTeamDrives: SUPPORT_TEAM_DRIVES,
            includeItemsFromAllDrives: INCLUDE_ITEMS_FROM_ALL_DRIVES,
            pageSize: 500,
        })
        console.log(response_changes)
        await saveStartPageToken(response_changes?.data?.newStartPageToken)
        /*
        const response_watch = await drive.files.watch({
            fileId: FOLDER_ID,
            pageToken: START_PAGE_TOKEN,
            supportsAllDrives: SUPPORT_ALL_DRIVES,
            supportsTeamDrives: SUPPORT_TEAM_DRIVES,
            includeItemsFromAllDrives: INCLUDE_ITEMS_FROM_ALL_DRIVES,
            requestBody: requestBody,
        })
            */
        res.send(JSON.stringify(response_changes?.data?.changes))
    } catch (error) {
        console.log(error)
    }

  })

app.use(router)

app.listen(PORT, (error) =>{
    if(!error)
        console.log("Server is listening on port "+ PORT)
    else 
        console.log("Error occurred, server can't start", error);
    }
)

module.exports = router;