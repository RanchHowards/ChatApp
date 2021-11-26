const { createServer } = require('http')
const express = require('express')
const { execute, subscribe } = require('graphql')
const { ApolloServer, gql } = require('apollo-server-express')
const { PubSub, withFilter } = require('graphql-subscriptions')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const pubsub = new PubSub()
const app = express()
const httpServer = createServer(app)

// const bcrypt = require('bcrypt')
// const saltRounds = 10
// const jwt = require('jsonwebtoken')
const Chat = require('./models/chat.js')
// const Event = require('./models/event')
// const Comment = require('./models/comment')

//MONGOOSE
// const JWT_SECRET = process.env.SECRET
;(async () => {
  const MONGODB_URI = process.env.MONGODB

  const PORT = process.env.PORT || 4000

  // console.log('connecting to', MONGODB_URI)

  mongoose
    .connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useFindAndModify: false,
      // useCreateIndex: true,
    })
    .then(() => {
      console.log('connected to MongoDB')
    })
    .catch((error) => {
      console.log('error connection to MongoDB:', error.message)
    })

  app.use(cors())

  // Schema definition
  const typeDefs = gql`
    type Message {
      message: String
      author: String
      id: ID
      chatID: ID
    }
    type Chat {
      name: String
      messages: [Message]
      id: ID
    }
    type Query {
      chats: [Chat]
      findChat(id: ID): Chat
    }
    type Mutation {
      addMessage(message: String, author: String, chatID: ID): Message
      deleteChat(chatID: ID): Chat
      createChat(name: String): Chat
    }
    type Subscription {
      messageAdded(chatID: ID): Message
    }
  `
  // Resolver map
  const resolvers = {
    Query: {
      chats: async () => {
        return Chat.find({})
      },
      findChat: async (root, { id }) => {
        return await Chat.findById(id)
      },
    },
    Mutation: {
      createChat: async (root, { name }) => {
        try {
          const newChat = new Chat({ name })
          await newChat.save()
          return newChat
        } catch (err) {
          console.log('CREATE CHAT', err)
        }
      },
      deleteChat: async (root, { chatID }) => {
        try {
          const chat = await Chat.findByIdAndDelete(chatID)
          console.log('CHAT deleted')
          return chat
        } catch (err) {
          console.log('deleteChat ERROR', err)
        }
      },
      addMessage: async (root, { message, author, chatID }) => {
        const newMessage = { message, author, chatID }
        try {
          const chat = await Chat.findById(chatID)
          chat.messages.push(newMessage)
          await chat.save()
          //subscription, adding whole chat right now but probably should just add new message
          pubsub.publish('MESSAGE_ADDED', { messageAdded: newMessage })
          return chat.messages[chat.messages.length - 1]
        } catch (err) {
          console.log('addMessage from DB', err)
        }
      },
    },
    Subscription: {
      messageAdded: {
        subscribe: withFilter(
          () => pubsub.asyncIterator(['MESSAGE_ADDED']),
          (payload, variables) => {
            return payload.messageAdded.chatID === variables.chatID
          }
        ),
      },
    },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  const server = new ApolloServer({
    cors: true,
    introspection: true,
    schema,
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close()
            },
          }
        },
      },
    ],
  })
  await server.start()
  server.applyMiddleware({ app })

  SubscriptionServer.create(
    { schema, execute, subscribe },
    { server: httpServer, path: server.graphqlPath }
  )

  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Query endpoint ready at http://localhost:${PORT}${server.graphqlPath}`
    )
    console.log(
      `🚀 Subscription endpoint ready at ws://localhost:${PORT}${server.graphqlPath}`
    )
  })
})()
