import fs from 'fs'
import path from 'path'

const getRandonKeysArr = arr => {
  if (arr) {
    return arr.sort(() => Math.floor(Math.random()*100 + 1)%2 ? 1 : -1)
  }
  return arr
}

const wordData = fs.readFileSync(path.join(path.resolve(__dirname, '../'), 'words.txt'), 'utf-8')
let allWords = wordData.split('\n')

let allKeys = allWords.map(item => item.split(':'))

let gameKeys = getRandonKeysArr(allKeys)
let keyIndex = 0

export const getNextKey = () => {
  let keyWord = gameKeys[keyIndex++]
  if (!keyWord) {
    gameKeys = getRandonKeysArr(allKeys)
    keyIndex = 0
    keyWord = gameKeys[keyIndex++]
  }
  return keyWord
}