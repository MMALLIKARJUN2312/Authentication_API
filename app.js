const express = require('express')
const app = express()
app.use(express.json())

const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')

let dbPath = path.join(__dirname, 'userData.db')

let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is Running at http://localhost:3000/')
    })
  } catch (error) {
    console.log(`DB Error : ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

//Register API :

app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const hashedPassword = await bcrypt.hash(password, 10)
  const checkingUserQuery = `SELECT * FROM user WHERE username = '${username}';`
  const dbUser = await db.get(checkingUserQuery)

  //Scenario 1:
  if (dbUser !== undefined) {
    response.status(400)
    response.send('User already exists')
  } else {
    //Scenario 2:
    if (password.length < 5) {
      response.status(400)
      response.send('Password is too short')
    } else {
      //Scenario 3:
      const createNewUserQuery = `
      INSERT INTO user(username, name, password, gender, location)
      VALUES('${username}', '${name}', '${hashedPassword}', '${gender}', '${location}')`
      await db.run(createNewUserQuery)
      response.send('User created successfully')
    }
  }
})

//Login API :

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `
  SELECT * FROM user WHERE username = '${username}';`
  const dbUser = await db.get(selectUserQuery)
  //Scenario 1:
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    //Scenario 2:
    if (isPasswordMatched === false) {
      response.status(400)
      response.send('Invalid password')
    } else {
      //Scenario 3:
      response.status(200)
      response.send('Login success!')
    }
  }
})

//Change-password API :

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const newHashedPassword = await bcrypt.hash(newPassword, 10)
  const selectUserQuery = `
  SELECT * FROM user WHERE username = '${username}'`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser !== undefined) {
    const checkOldPassword = await bcrypt.compare(oldPassword, dbUser.password)

    //Scenario 1:
    if (checkOldPassword === false) {
      response.status(400)
      response.send('Invalid current password')
    } else {
      //Scenario 2:
      if (newPassword.length < 5) {
        response.status(400)
        response.send('Password is too short')
      } else {
        //Scenario 3:
        const updatePasswordQuery = `
        UPDATE user 
        SET password = '${newHashedPassword}'
        WHERE username = '${username}'`
        await db.run(updatePasswordQuery)
        response.status(200)
        response.send('Password updated')
      }
    }
  }
})

module.exports = app
