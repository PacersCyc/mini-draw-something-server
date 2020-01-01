import { getNextKey } from './data'

const firstScore = 3
const secondScore = 2
const normalScore = 1

// 获取游戏内在线玩家
const getOnlinePlayersInGame = (currentGame) => {
  return currentGame.players.filter(p => p.status === 0)
}

// 将得分同步进玩家列表
const getCountScorePlayers = (currentGame) => {
  const { players, resScore } = currentGame

  if (resScore) {
    return players.map(p => ({
      ...p,
      score: resScore[p.uid] || 0
    }))
  }
  return players
}

// 找到下一个在线作画者
const goToNextPlay = (currentGame) => {
  const { players } = currentGame
  let onlinePlayers = getOnlinePlayersInGame(currentGame)
  let painter = players.find(p => p.isPainter === true)
  let pIndex = players.indexOf(painter)

  let nextIndex = (pIndex + 1 > players.length - 1) ? 0 : pIndex + 1
  // 找到下一个在线的作画者
  const getNextPainter = (nextIndex, players, onlinePlayers) => {
    if (onlinePlayers.indexOf(players[nextIndex]) > -1) {
      return players[nextIndex]
    } else {
      nextIndex = (nextIndex + 1 > players.length - 1) ? 0 : nextIndex + 1
      return getNextPainter(nextIndex, players, onlinePlayers)
    }
  }
  let newPainter = getNextPainter(nextIndex, players, onlinePlayers)
  newPainter.isPainter = true

  players[pIndex].isPainter = false
  currentGame.playInfo = {
    key: getNextKey(),
    painter: newPainter,
    gameTime: 60
  }
}

// 向玩家更新下一轮游戏信息
const updateGameData = (currentGame, io) => {
  const { players, socketRoom, playInfo, playTimes } = currentGame
  let eventName = playTimes > 0 ? 'nextPlay' : 'startGame'
  let onlinePlayers = getOnlinePlayersInGame(currentGame)
  onlinePlayers.forEach(p => {
    let gameInfo = {
      // id,
      socketRoom,
      painter: currentGame.playInfo.painter,
      players: getCountScorePlayers(currentGame),
      key: null,
      isPainter: false,
      gameTime: 60
    }
    if (p.clientId === playInfo.painter.clientId) {
      gameInfo.key = playInfo.key[0]
      gameInfo.isPainter = true
    } else {
      gameInfo.key = `${playInfo.key[0].length}个字 ${playInfo.key[1]}`
    }
    io.sockets.connected[p.clientId].emit(eventName, gameInfo)
  })
}

// 收到正确答案时计算得分
const countScore = (answerer, currentGame) => {
  // 计算每轮得分
  const { userScore, playInfo } = currentGame
  let currentKey = playInfo.key[0]
  let scoreMap = userScore[currentKey]
  if (!scoreMap) {
    scoreMap = {}
    scoreMap[playInfo.painter.uid] = 0 // 预先加入作画者分数方便后续长度计算
  }
  userScore[currentKey] = scoreMap
  let currentUserId = answerer.uid
  // 答题者已经有分数则忽略这次计算
  if (!scoreMap[currentUserId]) {
    // 标识是否已答过
    answerer.answered = false
    let answerNumber = Object.keys(scoreMap).length
    if (answerNumber === 1) { // 没有记录说明第一个答对
      scoreMap[currentUserId] = firstScore
      // 第一个答对，游戏时间缩短为30s
      if (playInfo.gameTime > 30) {
        playInfo.gameTime = 30
      }
    } else if (answerNumber === 2) {
      scoreMap[currentUserId] = secondScore
    } else {
      scoreMap[currentUserId] = normalScore
    }

    // 每答对一个，作画者得分+1
    scoreMap[playInfo.painter.uid] = Object.keys(scoreMap).length - 1
  } else {
    answerer.answered = true
  }
}

// 判断当前轮次游戏猜画者是否全部答完
const isAllFinish = (currentGame) => {
  const { playInfo, userScore, players } = currentGame
  let currentKey = playInfo.key[0]
  let scoreMap = userScore[currentKey]
  let answerNumber = Object.keys(scoreMap).length

  return answerNumber >= getOnlinePlayersInGame(currentGame).length // players要做在线状态过滤，记得！！！
}

// 计算和统计所有轮次和玩家得分
const getResScore = (currentGame) => {
  let resScore = {}

  // 这不报错，奇技淫巧服了，抄的。。。
  Object.values(currentGame.userScore).forEach(sm => {
    Object.keys(sm).forEach(uid => {
      resScore[uid] = sm[uid] + (resScore[uid] || 0)
    })
  })
  currentGame.resScore = resScore
  return resScore
}

// 结算当前轮次游戏并公布答案
const countCurrentRound = (currentGame, io) => {
  let sendData = {
    answer: currentGame.playInfo.key[0],
    resScore: currentGame.resScore
  }
  currentGame.playTimes++
  sendData.times = currentGame.playTimes
  io.to(currentGame.socketRoom).emit('thisOver', sendData)
}

// 判断游戏是否结束或开始下一轮
const gameOverOrNext = (currentGame, roomData, io, updateAllHomeInfo) => {
  console.log(currentGame.playTimes)
  console.log('-----------')
  console.log(updateAllHomeInfo)
  console.log('-----------')
  if (currentGame.playTimes >= currentGame.totalTimes || getOnlinePlayersInGame(currentGame).length < 2) {
    // 游戏结束
    let overData = {
      message: 'gameover',
      gameData: currentGame
    }
    setTimeout(() => {
      // gameData[currentGame.id].status = 0
      roomData[currentGame.id].status = 0
      io.to(currentGame.socketRoom).emit('gameover', overData)

      updateAllHomeInfo()
    }, 2000)
  } else {
    // 下一轮
    goToNextPlay(currentGame)
    setTimeout(() => {
      updateGameData(currentGame, io)
      setTimeout(() => {
        timeCountDown(currentGame, roomData, io, updateAllHomeInfo)
      }, 1000)
    }, 3000)
  }
}

// 当前轮次游戏开始倒计时
const timeCountDown = (currentGame, roomData, io, updateAllHomeInfo) => {
  const { socketRoom } = currentGame
  if (currentGame.playInfo.gameTime >= 0) {
    // console.log(currentGame.playInfo.gameTime)
    currentGame.timer = setTimeout(() => {
      currentGame.playInfo.gameTime--
      timeCountDown(currentGame, roomData, io, updateAllHomeInfo)
    }, 1000)

    let sendData = {
      // players: currentGame.players,
      time: currentGame.playInfo.gameTime
    }
    io.to(socketRoom).emit('gameData', sendData)
  } else {
    clearTimeout(currentGame.timer)

    let scoreMap = currentGame.userScore[currentGame.playInfo.key[0]]
    if (!scoreMap) {
      currentGame.userScore[currentGame.playInfo.key[0]] = {}
    }
    getResScore(currentGame)

    countCurrentRound(currentGame, io)

    gameOverOrNext(currentGame, roomData, io, updateAllHomeInfo)
  }
}

// 掉线更新相关房间信息
const updateRelatedRoomInfo = (roomData, id, leftPlayer) => {
  console.log(leftPlayer)
  let room = roomData[id]
  let { playersCount } = room
  console.log(playersCount)
  if (playersCount <= 1) {
    delete roomData[id] // 没人了删除房间
  } else {
    room.playersCount--
    room.players = room.players.filter(p => p.uid !== leftPlayer.uid)
    if (room.master.uid === leftPlayer.uid) {
      room.master = room.players[0]
    }
    console.log(room)
  }
}

// 掉线更新相关游戏信息
const updateRelatedGameInfo = (gameData, roomData, id, leftPlayer, io, updateAllHomeInfo)  => {
  let game = gameData[id]
  console.log(game)
  // 更改玩家在线状态
  let gPlayer = game.players.find(p => p.uid === leftPlayer.uid)
  gPlayer.status = 1

  let len = getOnlinePlayersInGame(game).length
  if (len < 2) {  //少于2人则结束游戏，更新房间状态
    delete gameData[id]
    roomData[id].status = 0
    let overData = {
      message: 'gameover',
      gameData: game
    }
    if (game.timer) {
      clearTimeout(game.timer)
    }
    io.to(game.socketRoom).emit('gameover', overData)
  } else {
    let msg = {
      type: 'notify',
      playerName: leftPlayer.username,
      message: '掉线了'
    }
    io.to(game.socketRoom).emit('message', msg)
    if (leftPlayer.uid === game.playInfo.painter.uid) {
      // 如果掉线的是作画者，直接结束本轮并结算
      if (game.timer) {
        clearTimeout(game.timer)
      }
      setTimeout(() => {
        getResScore(game)
        countCurrentRound(game, io)
        gameOverOrNext(game, roomData, io, updateAllHomeInfo)
      }, 1000)
    }
  }
}

export default {
  getOnlinePlayersInGame,
  getCountScorePlayers,
  goToNextPlay,
  countScore,
  isAllFinish,
  getResScore,
  updateGameData,
  countCurrentRound,
  gameOverOrNext,
  timeCountDown,
  updateRelatedRoomInfo,
  updateRelatedGameInfo
}