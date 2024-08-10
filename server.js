const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const app = express();
const upload = multer({ dest: 'uploads/' }); // Destination folder for uploaded files
const fs = require('fs');
const path = require("path");
const uuid = require("uuid");

// Load environment variables from .env file
dotenv.config();

// Configuration
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;
const scopes = ['https://www.googleapis.com/auth/drive'];
const PORT = 3000;
const SUPPORT_ALL_DRIVES = true;
const SUPPORT_TEAM_DRIVES = true;
const INCLUDE_ITEMS_FROM_ALL_DRIVES = true;
const FOLDER_ID = '1K_6FLNo49uQZgHw_aWLhNBTHJ3QE5vxf'
let START_PAGE_TOKEN = ''

// Create an OAuth2 client
const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

// Generate the authentication URL
const authUrl = oAuth2Client.generateAuthUrl({
  // 'online' (default) or 'offline' (gets refresh_token)
  access_type: 'offline',
  /** Pass in the scopes array defined above.
  * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
  scope: scopes,
  // Enable incremental authorization. Recommended as a best practice.
  include_granted_scopes: true
});

//app.use(bodyParser.json())

// Get the authentication URL
app.get('/auth/google', (req, res) => {
    //res.send(authUrl);
    res.redirect(authUrl);
});

var drive = google.drive({
    version: "v3",
    auth: oAuth2Client,
});

// Handle the callback from the authentication flow
app.get('/callback', async (req, res) => {
    const code = req.query.code;

    try {
        // Exchange the authorization code for access and refresh tokens
        const { tokens } = await oAuth2Client.getToken(code);
        const accessToken = tokens.access_token;
        const refreshToken = tokens.refresh_token;
        oAuth2Client.setCredentials({ refresh_token: refreshToken, access_token:accessToken });

        // Save the tokens in a database or session for future use
        fs.writeFileSync(path.join(__dirname, "tokens.json"), JSON.stringify(tokens), "utf8");

        const response_sp = await drive.changes.getStartPageToken()
        START_PAGE_TOKEN = response_sp?.data?.startPageToken
        res.redirect('/changes');

        // Read data
        // const rData = fs.readFileSync(path.join(__dirname, "outputfilepath", "outputfile.json"), "utf8");
        // const jsonData = JSON.parse(rData);
        
    } catch (error) {
        console.error('Error authenticating:', error);
        res.status(500).send('Authentication failed.');
    }
});

app.get('/files', async (req, res) => {
    try {
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
            pageToken: START_PAGE_TOKEN,
            supportsAllDrives: SUPPORT_ALL_DRIVES,
            supportsTeamDrives: SUPPORT_TEAM_DRIVES,
            includeItemsFromAllDrives: INCLUDE_ITEMS_FROM_ALL_DRIVES,
            pageSize: 500,
        })
        console.log(response_changes)
        START_PAGE_TOKEN = response_changes?.data?.newStartPageToken
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

app.post('/hook', async (req, res) => {
    console.log(req)
    res.status(200)
})

app.listen(PORT, (error) =>{
    if(!error)
        console.log("Server is listening on port "+ PORT)
    else 
        console.log("Error occurred, server can't start", error);
    }
)