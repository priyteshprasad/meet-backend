import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import {
  getFlow,
  saveFlow,
  createSession,
  getSession,
  recordChoice,
  getAnswers,
  isAnswerSubmitted
} from './db.js'
import { sendConversationEmail } from './mail.js'

const app = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = (process.env.FRONTEND_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors(),
)
app.use(express.json())

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get(
  '/api/flow',
  asyncRoute(async (_req, res) => {
    res.json(await getFlow())
  }),
)

app.put(
  '/api/flow',
  asyncRoute(async (req, res) => {
    const flow = req.body
    if (!flow?.nodes || !flow?.meta?.startNode) {
      return res.status(400).json({ error: 'Flow must include meta.startNode and nodes' })
    }
    await saveFlow(flow)
    res.json({ ok: true })
  }),
)

app.post(
  '/api/sessions',
  asyncRoute(async (_req, res) => {
    const flow = await getFlow()
    const start = flow.meta.startNode
    const session = await createSession(start)
    res.json({
      sessionId: session.id,
      node: flow.nodes[start],
    })
  }),
)

app.get('/api/isRuhiAnswered', 
  asyncRoute(async (_req, res) => {
    const isRuhiAnswered = await isAnswerSubmitted();
    res.json({ isRuhiAnswered: isRuhiAnswered.length > 0 });
  })
)
app.get(
  '/api/sessions/:id',
  asyncRoute(async (req, res) => {
    const session = await getSession(req.params.id)
    if (!session) return res.status(404).json({ error: 'Session not found' })
    const flow = await getFlow()
    res.json({
      sessionId: session.id,
      node: flow.nodes[session.current_node],
      answers: await getAnswers(session.id),
    })
  }),
)

app.post(
  '/api/sessions/:id/choice',
  asyncRoute(async (req, res) => {
    const session = await getSession(req.params.id)
    if (!session) return res.status(404).json({ error: 'Session not found' })

    const { optionId, inputText } = req.body
    const flow = await getFlow()
    const node = flow.nodes[session.current_node]
    if (!node) return res.status(400).json({ error: 'Current node missing from flow' })

    const option = node.options?.find((o) => o.id === optionId)
    if (!option) return res.status(400).json({ error: 'Unknown option' })

    const next = flow.nodes[option.next]
    if (!next) return res.status(400).json({ error: 'Next node missing from flow' })

    await recordChoice({
      sessionId: session.id,
      nodeId: node.id,
      optionId,
      nextNode: next.id,
      inputText: typeof inputText === 'string' ? inputText.trim() : null,
      isEnd: next.kind === 'end' && option.id !== 'restart',
    })

    const answers = await getAnswers(session.id)
    sendConversationEmail({ sessionId: session.id, flow, answers }).catch((err) => {
      console.error('Failed to send conversation email', err)
    })

    res.json({ node: next })
  }),
)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Server error' })
})

app.listen(PORT, () => {
  console.log(`Meet-request API on http://localhost:${PORT}`)
})
