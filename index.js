const { happy_scribe_key } = require('./credentials.json')
const fetch = require('node-fetch')
const { exec, cp } = require('shelljs')
const { v4: uuidV4 } = require('uuid')
const fs = require('fs')

const authorization = `Bearer ${happy_scribe_key}`
const nameOfVideoFile = 'wandavision'
const typeOfVideoFile = '.mp4'

master(nameOfVideoFile,typeOfVideoFile,authorization)

const Random = () => uuidV4()
const sleep = async(time) => await new Promise(r => setTimeout(r, time));

async function convertVideoToAudio(nameOfVideoFile,typeOfVideoFile){
  const nameOfAudioFile = `${nameOfVideoFile}.mp3`
  if(!fs.existsSync(`./${nameOfAudioFile}`)){
    const commandToConvertVideoToAudio = `ffmpeg -i ${nameOfVideoFile}${typeOfVideoFile} -b:a 16M -acodec libmp3lame ${nameOfAudioFile}`
    await exec( commandToConvertVideoToAudio, { silent: true } )

    console.log(`> ${nameOfAudioFile} created\n`)
  }

  return nameOfAudioFile
}

async function createUrlOfAudioFile(nameOfAudioFile,authorization){
  return new Promise((resolve,reject) => {
    fetch(`https://www.happyscribe.com/api/v1/uploads/new?filename=${nameOfAudioFile}`, {
      headers: {
        authorization,
      }
    })      
      .then(response => {
        console.log('> Url of audio file created\n')
        resolve(response.json())
      })
      .catch(err => reject(err))
  })

}

async function uploadFileInSignedUrl(nameOfAudioFile,signedUrl) {
  const commandToPutAudioInSignedUrl = `curl -X PUT -T ${nameOfAudioFile} -L "${signedUrl}"`
  await exec( commandToPutAudioInSignedUrl, { silent: true } )
}

async function createTranscription(name=Random(),language="en-US",urlOfAudioFile,authorization){
  return new Promise((resolve,reject) => {
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
      .then(response => {
        console.log('> Transcription was created\n')
        resolve(response.json())
      })
      .catch(err => reject(err))

  })

}

// function getAllTranscriptions(authorization){
//   return new Promise((resolve, reject) => {
//     fetch('https://www.happyscribe.com/api/v1/transcriptions', {
//         headers: {
//           authorization
//         }
//     })
//       .then(response => {
//         console.log('> We took All Transcriptions\n')
//         resolve(response.json())
//       })
//       .catch(err => reject(err))
//   })
// }

function getInformationOfOneTranscription(transcriptionID,authorization){
  return new Promise((resolve, reject) => {
    console.log('> Starting fetch at function getInformationOfOneTranscription\n')
    fetch(`https://www.happyscribe.com/api/v1/transcriptions/${transcriptionID}`, {
      headers: {
        authorization
      }
    })
      .then(response => {
        console.log(`> We took information of transcription with ID ${transcriptionID}\n`)
        return response.json()
      })
      .then(async informationOfTranscription => {
        const { state } = informationOfTranscription

        if(state == 'initial' || state == 'locked' || state == 'ingesting'){
          console.log(`> Awaiting 20 seconds because state is ${state}\n`)
          await sleep(20 * 1000)
          console.log(`> Doing other fetch because state is ${state}\n`)
          const responseOfOtherFetch = await getInformationOfOneTranscription(transcriptionID,authorization)
          resolve(responseOfOtherFetch)
        }else if(state == 'failed'){
          console.log('> State is failed')
          reject('Failed')
        }
      })
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
      .then(response => {
        console.log(`> The transcription with id:${transcriptionID} was successfully exported\n`)
        resolve(response.json())
      })
      .catch(err => reject(err))
  })
}


function getInformationOfExportedTranscription(authorization,exportID){
  return new Promise((resolve, reject) => {
    console.log(`> Starting fetch of function getInformationOfExportedTranscription\n`)
    fetch(`https://www.happyscribe.com/api/v1/exports/${exportID}`, {
      headers: {
        authorization
      }
    })
      .then(response => response.json())
      .then(async exportedTranscription => {
        const { state } = exportedTranscription

        if(state == 'pending' || state == 'processing' || state == 'expired' || state == 'failed'){
          console.log(`> Awaiting 20 seconds because state is ${state}\n`)
          await sleep(20 * 1000)
          console.log(`> Doing other fetch because state is ${state}\n`)
          const responseOfOtherFetch = await getInformationOfExportedTranscription(authorization,exportID)
          resolve(responseOfOtherFetch)
        }

        console.log(`> The transcriptions with exportID:${exportID} was successfully exported\n\n`)
        resolve(exportedTranscription)
      })
      .catch(err => reject(err))
  })
}

async function master(nameOfVideoFile,typeOfVideoFile,authorization){
  const nameOfAudioFile = convertVideoToAudio(nameOfVideoFile,typeOfVideoFile)
  const { signedUrl } = await createUrlOfAudioFile(nameOfAudioFile,authorization)
  console.log(`> Signed url: ${signedUrl}\n`)
  uploadFileInSignedUrl(nameOfAudioFile,signedUrl)
  const { id:transcriptionID } = await createTranscription(nameOfAudioFile,'en-US',signedUrl,authorization)
  console.log(`> Transcription ID: ${transcriptionID}\n`)
  // const AllTranscriptions = await getAllTranscriptions(authorization)
  // const transcriptionID = AllTranscriptions.results[0].id
  console.log('> Awaiting 20 seconds to get information of transcription\n')
  await sleep(20 * 1000)
  const informationOfTranscription = await getInformationOfOneTranscription(transcriptionID,authorization)
  if(informationOfTranscription.state == "failed") return console.log('> File failed to process\n')
  const { id:exportID } = await exportTranscription(authorization,transcriptionID)
  console.log(`> Export ID: ${exportID}\n`)
  // const exportID = 'b9b70deb-c242-4b8e-88db-e224d1872c12'
  const { download_link } = await getInformationOfExportedTranscription(authorization,exportID)

  console.log(`> Go to ${download_link} and download the .srt file\n`)
}