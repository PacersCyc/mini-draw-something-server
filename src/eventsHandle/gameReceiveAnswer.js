import service from '../service'
const {
  countScore,
  getResScore,
  isAllFinish,
  countCurrentRound,
  gameOverOrNext
} = service

export default function gameReceiveAnswerHandle(data, roomData, gameData, io, updateAllHomeInfo) {
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
        countCurrentRound(currentGame, io)

        gameOverOrNext(currentGame, roomData, io, updateAllHomeInfo)
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
}