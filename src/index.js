import path from 'path'
import http from 'http'
import Koa from 'koa'
import socketIo from 'socket.io'
import uuid from 'uuid/v4'

const PORT = 9000
const app = new Koa()
const server = http.createServer(app.callback())
const io = socketIo(server)

let generateRoomId = () => {
  let d = new Date()
  return parseInt('' + d.getDate() + d.getHours() + d.getMinutes() + d.getSeconds())
}

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

let baseInfo = {
  onlineUsers,
  roomData
}

let handleConnect = (socket, baseInfo) => {
  console.log('user comes in', socket.id)
  console.log(socket.rooms)
  let {
    onlineUsers,
    roomData
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

  socket.on('updateHome', () => {
    updateHomeInfo()
  })

  socket.on('createUser', (data) => {
    console.log(data)
    let uid = uuid()
    onlineUsers[uid] = {
      username: data.name,
      uid
    }
    // onlineCount ++
    socket.emit('login', onlineUsers[uid])
  })

  socket.on('updateUserName', data => {
    console.log(data)
    const { uid, name } = data

    if (uid in onlineUsers) {
      onlineUsers[uid].username = name
      socket.emit('nameUpdated', onlineUsers[uid])
    } else {
      socket.emit('nameUpdated', {
        username: name,
        uid
      })
    }
  })

  socket.on('createRoom', data => {
    console.log(data)
    let roomId = generateRoomId()
    let newRoom = {
      id: roomId,
      name: data.roomName,
      status: 0,
      type: data.roomType,
      master: data.master,
      players: [data.master],
      playersCount: 1
    }
    roomData[roomId] = newRoom

    io.emit('homeInfo', getHomeInfo())
    socket.emit('enterRoom', roomData[roomId])
  })

  socket.on('enterRoom', data => {
    console.log(data)
    const {
      roomId,
      player
    } = data
    let formalPlayers = roomData[roomId].players
    roomData[roomId].players = formalPlayers.concat(player)

    // 更新房间信息
    socket.emit('updateRoomInfo', roomData[roomId])
    // 同步外部信息
    updateAllHomeInfo()
  })

  socket.on('leftRoom', data => {
    console.log(data)
    const {
      roomId,
      player
    } = data
    let formalPlayers = roomData[roomId].players
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

    updateAllHomeInfo()
  })

  socket.on('disconnect', () => {
    console.log('disconnect!')
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