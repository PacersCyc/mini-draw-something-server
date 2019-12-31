import path from 'path'
import http from 'http'
import Koa from 'koa'
import socketIo from 'socket.io'
import uuid from 'uuid/v4'
import { getNextKey } from './data'

const firstScore = 3
const secondScore = 2
const normalScore = 1

const PORT = 9000
const app = new Koa()
const server = http.createServer(app.callback())
const io = socketIo(server)

let generateRoomId = () => {
  let d = new Date()
  return parseInt('' + d.getDate() + d.getHours() + d.getMinutes() + d.getSeconds())
}
// socket 房间id
let count = 0

// 在线玩家
let onlineUsers = {}
// 在线人数
let onlineCount = 0

let roomData = {
  // '24017': {
  //   id: '24017',
  //   playersCount: 3,
  //   type: 0,
  //   status: 0,
  //   master: {
  //     uid: '2134',
  //     username: '我嘞个去'
  //   }
  // },
  // '24077': {
  //   id: '24077',
  //   playersCount: 4,
  //   type: 0,
  //   status: 1,
  //   master: {
  //     uid: '2234',
  //     username: '哈哈哈哈'
  //   }
  // }
}

let gameData = {}

let baseInfo = {
  onlineUsers,
  roomData,
  gameData
}

let handleConnect = (socket, baseInfo) => {
  console.log('user comes in', socket.id)
  console.log(socket.rooms)

  let clientId = socket.id
  let {
    onlineUsers,
    roomData,
    gameData
  } = baseInfo

  const getHomeInfo = () => ({
    roomData: Object.keys(roomData).map(key => ({ ...roomData[key], id: key })),
    onlineCount
  })

  const updateAllHomeInfo = () => {
    io.emit('homeInfo', getHomeInfo())
  }

  const updateHomeInfo = () => {
    socket.emit('homeInfo', getHomeInfo())
  }

  onlineCount++
  console.log(onlineCount)

  updateAllHomeInfo()

  socket.on('login', data => {
    console.log(data)

    onlineUsers[clientId] = {
      ...data,
      clientId,
      currentRoom: ''
    }
    console.log(onlineUsers)
  })

  socket.on('updateHome', () => {
    updateHomeInfo()
  })

  socket.on('createUser', (data) => {
    console.log(data)
    let uid = uuid()
    onlineUsers[clientId] = {
      username: data.name,
      uid,
      clientId,
      currentRoom: ''
    }
    // onlineCount ++
    socket.emit('login', onlineUsers[clientId])
  })

  socket.on('updateUserName', data => {
    console.log(data)
    const { uid, name } = data

    if (clientId in onlineUsers) {
      onlineUsers[clientId].username = name
      socket.emit('nameUpdated', onlineUsers[clientId])
    } else {
      socket.emit('nameUpdated', {
        username: name,
        uid
      })
    }
  })

  socket.on('searchRoom', data => {
    console.log(data)
    const { roomId, player } = data

    if (roomData[roomId]) { 
      // 有则直接进入房间
      let socketRoom = roomData[roomId].socketRoom

      let formalPlayers = roomData[roomId].players
      roomData[roomId].players = formalPlayers.concat({ ...player, clientId }).map(p => ({ ...p, status: 0 }))
      roomData[roomId].playersCount++
      onlineUsers[clientId].currentRoom = roomId

      socket.join(socketRoom, () => {
        console.log(`${player.username}进入房间${socketRoom}...`)
      })
      socket.emit('enterRoom', roomData[roomId])
      updateAllHomeInfo()
    } else {
      socket.emit('searchRoom', '此房间不存在')
    }
  })

  socket.on('createRoom', data => {
    console.log(data)
    let roomId = generateRoomId()
    let socketRoom = 'room ' + (++count)
    let newRoom = {
      id: roomId,
      socketRoom,
      name: data.roomName,
      status: 0,
      type: data.roomType,
      master: { ...data.master, clientId },
      players: [{ ...data.master, clientId }].map(p => ({
        ...p,
        status: 0,  // 表示玩家在房间内状态 0:准备中 1:游戏中 
      })),
      // playTimers: 3,
      playersCount: 1
    }
    roomData[roomId] = newRoom
    onlineUsers[clientId].currentRoom = roomId

    socket.join(socketRoom, () => {
      console.log(`${roomData[roomId].master.username}进入房间${socketRoom}`)
    })

    io.emit('homeInfo', getHomeInfo())
    socket.emit('enterRoom', roomData[roomId])
  })

  socket.on('enterRoom', data => {
    console.log(data)
    const {
      roomId,
      socketRoom,
      player
    } = data
    let formalPlayers = roomData[roomId].players
    roomData[roomId].players = formalPlayers.concat({ ...player, clientId }).map(p => ({ ...p, status: 0 }))
    roomData[roomId].playersCount++
    onlineUsers[clientId].currentRoom = roomId
    // roomData[roomId].playTimers += 2

    socket.join(socketRoom, () => {
      console.log(`${player.username}进入房间${socketRoom}...`)
    })

    // 更新房间信息
    socket.emit('updateRoomInfo', roomData[roomId])
    // 同步外部信息
    updateAllHomeInfo()
  })

  socket.on('leftRoom', data => {
    console.log(data)
    const {
      roomId,
      socketRoom,
      player
    } = data
    let formalPlayers = roomData[roomId].players
    roomData[roomId].playersCount--
    // 房间没人了移除房间
    if (formalPlayers.length <= 1) {
      delete roomData[roomId]
    } else {
      roomData[roomId].players = formalPlayers.filter(item => item.uid !== player.uid)
      // 退的是房主则移交房主
      if (player.uid === roomData[roomId].master.uid) {
        roomData[roomId].master = roomData[roomId].players[0]
      }
    }
    onlineUsers[clientId].currentRoom = ''

    socket.leave(socketRoom, () => {
      console.log(`${player.username}离开了房间${socketRoom}`)
    })

    updateAllHomeInfo()
  })

  socket.on('chatMessage', data => {
    const { msg, player } = data
    console.log(msg)
    console.log(socket.rooms)
    // 获取房间名
    let socketRoom = Object.keys(socket.rooms)[1]
    io.to(socketRoom).emit('chatMessage', data)
  })

  // 获取游戏内在线玩家
  function getOnlinePlayersInGame(currentGame) {
    return currentGame.players.filter(p => p.status === 0)
  }

  function getCountScorePlayers(currentGame) {
    const { players, resScore } = currentGame

    if (resScore) {
      return players.map(p => ({
        ...p,
        score: resScore[p.uid] || 0
      }))
    }
    return players
  }

  function updateGameData(currentGame) {
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

  function goToNextPlay(currentGame) {
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

    // let newPainter
    // if (pIndex >= 0 && pIndex < players.length - 1) {
    //   newPainter = players[pIndex + 1]
    //   newPainter.isPainter = true
    // } else {
    //   newPainter = players[0]
    //   newPainter.isPainter = true
    // }
    players[pIndex].isPainter = false
    currentGame.playInfo = {
      key: getNextKey(),
      painter: newPainter,
      gameTime: 60
    }
  }

  function gameOverOrNext(currentGame, roomData) {
    console.log(currentGame.playTimes)
    if (currentGame.playTimes >= currentGame.totalTimes) {
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
        updateGameData(currentGame)
        setTimeout(() => {
          timeCountDown(currentGame, roomData)
        }, 1000)
      }, 3000)
    }
  }

  function timeCountDown(currentGame, roomData) {
    const { socketRoom } = currentGame
    if (currentGame.playInfo.gameTime >= 0) {
      // console.log(currentGame.playInfo.gameTime)
      currentGame.timer = setTimeout(() => {
        currentGame.playInfo.gameTime--
        timeCountDown(currentGame, roomData)
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

      countCurrentRound(currentGame)

      gameOverOrNext(currentGame, roomData)
    }
  }

  socket.on('startGame', data => {
    console.log(data)
    const { socketRoom, id, players } = data
    if (players.length < 2 || roomData[id].status !== 0) {
      console.log('无法开始游戏')
      return
    }

    let gameKey = getNextKey()

    roomData[id].status = 1
    gameData[id] = {
      id,
      socketRoom,
      totalTimes: players.length * 2 + 1,
      playTimes: 0,
      players: players.map(p => ({
        ...p,
        isPainter: p.clientId === socket.id,
        score: 0
      })),
      userScore: {},
      playInfo: {
        key: gameKey,
        painter: players[0],
        gameTime: 60
      }
    }
    let currentGame = gameData[id]
    updateGameData(currentGame)

    timeCountDown(currentGame, roomData)

    updateAllHomeInfo()
  })

  socket.on('drawAction', data => {
    // console.log(data)
    let socketRoom = Object.keys(socket.rooms)[1]

    switch (data.type) {
      case "start":
      case 'move':
        let sendData = {
          type: data.type,
          data: data.data,
          setting: data.setting
        }
        socket.broadcast.to(socketRoom).emit('drawAction', sendData)
      // io.to(socketRoom).emit('drawAction', sendData)
      default:
        break;
    }
  })

  socket.on('imageData', data => {
    // console.log(data)
    // console.log(socket.rooms)
    let socketRoom = Object.keys(socket.rooms)[1]

    socket.broadcast.to(socketRoom).emit('imageData', data)
  })


  function countScore(answerer, currentGame) {
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

  function isAllFinish(currentGame) {
    const { playInfo, userScore, players } = currentGame
    let currentKey = playInfo.key[0]
    let scoreMap = userScore[currentKey]
    let answerNumber = Object.keys(scoreMap).length

    return answerNumber >= getOnlinePlayersInGame(currentGame).length // players要做在线状态过滤，记得！！！
  }

  function getResScore(currentGame) {
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

  function countCurrentRound(currentGame) {
    let sendData = {
      answer: currentGame.playInfo.key[0],
      resScore: currentGame.resScore
    }
    currentGame.playTimes++
    sendData.times = currentGame.playTimes
    io.to(currentGame.socketRoom).emit('thisOver', sendData)
  }

  socket.on('answer', data => {
    console.log(data)
    const { gameId, answer, answerer } = data

    console.log(gameData[gameId])
    let msg
    let currentGame = gameData[gameId]
    const { playInfo, userScore } = currentGame

    let answerName = currentGame.players.find(p => p.uid === answerer.uid).username
    if (currentGame.playInfo.gameTime > 0) {
      // 如果答对
      if (currentGame.playInfo.key[0] === answer) {
        // 计算该轮得分
        countScore(answerer, currentGame)
        // 计算全部玩家得分
        getResScore(currentGame)
        // 判断是否全部答完
        if (isAllFinish(currentGame)) {
          // 清除定时器
          if (currentGame.timer) {
            clearTimeout(currentGame.timer)
          }
          // 结算本轮公布答案
          countCurrentRound(currentGame)

          gameOverOrNext(currentGame, roomData)
        } else {
          if (!answerer.answered) {
            msg = {
              type: 'answer',
              playerName: answerName,
              score: userScore[playInfo.key[0]][answerer.uid],
              // score: 3
              resScore: currentGame.resScore
            }

            io.to(currentGame.socketRoom).emit('message', msg)
          }
        }

      } else {
        // 没答对当作普通信息处理
        msg = {
          type: 'normal',
          playerName: answerName,
          message: answer
        }

        io.to(currentGame.socketRoom).emit('message', msg)
      }
    } else {
      io.to(currentGame.socketRoom).emit('timeover', 'timeout!')
    }

  })

  function updateRelatedRoomInfo(roomData, id, leftPlayer) {
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

  function updateRelatedGameInfo(gameData, roomData, id, leftPlayer) {
    let game = gameData[id]
    console.log(game)

    if (game.players.length <= 2) {  //少于2人则结束游戏，更新房间状态
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
      // 更改玩家在线状态
      let gPlayer = game.players.find(p => p.uid === leftPlayer.uid)
      gPlayer.status = 1
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
          countCurrentRound(game)
          gameOverOrNext(game, roomData)
        }, 1000)
      }
    }
  }

  socket.on('disconnect', () => {
    console.log('disconnect!')
    let leftPlayer = onlineUsers[clientId]
    let roomId = leftPlayer.currentRoom
    console.log(roomId)
    if (roomId) {
      let room = roomData[roomId]
      if (room && room.status === 1) { // 在游戏中则更新游戏信息
        updateRelatedGameInfo(gameData, roomData, roomId, leftPlayer)
      }
      updateRelatedRoomInfo(roomData, roomId, leftPlayer)
    }

    delete onlineUsers[clientId]
    console.log(onlineUsers)
    onlineCount--

    updateAllHomeInfo()
  })
}

io.on('connect', socket => {
  // console.log(io.sockets)
  handleConnect(socket, baseInfo)
})

server.listen(PORT, () => {
  console.log(`server start on ${PORT}`)
})