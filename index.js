const { happy_scribe_key } = require('./credentials.json')
const fetch = require('node-fetch')
const { exec } = require('shelljs')
const { v4: uuidV4 } = require('uuid')

const authorization = `Bearer ${happy_scribe_key}`
const nameOfVideoFile = 'wandavision'
const typeOfVideoFile = '.mp4'

master(nameOfVideoFile,typeOfVideoFile,authorization)

const Random = () => uuidV4()

async function convertVideoToAudio(nameOfVideoFile,typeOfVideoFile){
  const commandToConvertVideoToAudio = `ffmpeg -i ${nameOfVideoFile}${typeOfVideoFile} -b:a 16M -acodec libmp3lame ${nameOfVideoFile}.mp3`
  await exec( commandToConvertVideoToAudio, { silent: true } )
}

async function createTranslation(name=Random(),urlOfAudioFile,language="en-GB",authorization){
    fetch('https://www.happyscribe.com/api/v1/transcriptions', {
      method: 'POST',
      headers: {
        authorization,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        transcription: {
          name,
          language,
          tmp_url: urlOfAudioFile,
        }
      })
    })
}

function getAllTranscriptions(authorization){
  return new Promise((resolve, reject) => {
    fetch('https://www.happyscribe.com/api/v1/transcriptions', {
        headers: {
          authorization
        }
    })
      .then(response => response.json())
      .then(transcriptionsOfApi => resolve(transcriptionsOfApi))
      .catch(err => reject(err))
  })
}

function getInformationOfOneTranscription(transcriptionID,authorization){
  return new Promise((resolve, reject) => {
    fetch(`https://www.happyscribe.com/api/v1/transcriptions/${transcriptionID}`, {
      headers: {
        authorization
      }
    })
      .then(response => response.json())
      .then(transcriptionsOfApi => resolve(transcriptionsOfApi))
      .catch(err => reject(err))
  })
}

function exportTranscription(authorization,transcriptionID){
  return new Promise((resolve, reject) => {
    fetch('https://www.happyscribe.com/api/v1/exports', {
      method: 'POST',
      headers: {
        authorization,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        export: {
          format: 'srt', 
          transcription_ids: [ transcriptionID ] 
        }
      })
    })
      .then(response => response.json())
      .then(transcriptionsOfApi => resolve(transcriptionsOfApi))
      .catch(err => reject(err))
  })
}

const sleep = async(time) => await new Promise(r => setTimeout(r, time));

function getInformationOfExportedTranscription(authorization,exportID){
  return new Promise((resolve, reject) => {
    fetch(`https://www.happyscribe.com/api/v1/exports/${exportID}`, {
      headers: {
        authorization
      }
    })
      .then(response => response.json())
      .then(async transcriptionsOfApi => {
        let state
        do{
          state = transcriptionsOfApi.state
          console.log(`Awaiting 30 seconds because state is ${transcriptionsOfApi.state}`)
          await sleep(10 * 1000)
        }while(state == 'pending' || state == 'processing' || state == 'expired' || state == 'failed')
        resolve(transcriptionsOfApi)
      })
      .catch(err => reject(err))
  })
}

async function master(nameOfVideoFile,typeOfVideoFile,authorization){
  convertVideoToAudio(nameOfVideoFile,typeOfVideoFile)
  // const AllTranscriptions = await getAllTranscriptions(authorization)
  // const transcriptionID = AllTranscriptions.results[0].id
  // const informationOfTranscription = await getInformationOfOneTranscription(transcriptionID,authorization)
  // if(informationOfTranscription.failed) return console.log('File failed to process')
  // const { id:exportID } = await exportTranscription(authorization,transcriptionID)
  // ExportID: 9c75f739-7305-42d3-a1cb-4e20bd0bfd81
  // const { download_link } = await getInformationOfExportedTranscription(authorization,exportID)

  // console.log(`Go to ${download_link} and download the .srt file`)
}