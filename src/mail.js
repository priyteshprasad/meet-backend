import nodemailer from 'nodemailer'
import { MAIL_TO } from './config.js'

function createTransport() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) return null

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: { user, pass },
  })
}

function formatConversation(flow, answers) {
  if (!answers.length) return 'No answers yet.'

  return answers
    .map((answer, index) => {
      const node = flow.nodes[answer.node_id]
      const option = node?.options?.find((o) => o.id === answer.option_id)
      const prompt = node?.body?.split('\n')[0] || answer.node_id
      const choice = option?.label || answer.option_id
      const extra = answer.input_text ? `\n   typed: ${answer.input_text}` : ''
      return `${index + 1}. [${answer.node_id}]\n   ${prompt}\n   → ${choice}${extra}`
    })
    .join('\n\n')
}

export async function sendConversationEmail({ sessionId, flow, answers }) {
  const transporter = createTransport()
  if (!transporter) {
    console.warn('SMTP not configured; skipping email. Set SMTP_HOST, SMTP_USER, SMTP_PASS.')
    return
  }

  if (!MAIL_TO || MAIL_TO.includes('CHANGE_ME')) {
    console.warn('MAIL_TO is not set; skipping email. Edit backend/src/config.js or set MAIL_TO.')
    return
  }

  const from = process.env.MAIL_FROM || process.env.SMTP_USER
  const last = answers[answers.length - 1]
  const lastLabel =
    flow.nodes[last?.node_id]?.options?.find((o) => o.id === last?.option_id)?.label ||
    last?.option_id ||
    'a choice'

  const body = [
    `Ruhi conversation update`,
    `Session: ${sessionId}`,
    `Latest choice: ${lastLabel}`,
    `Steps so far: ${answers.length}`,
    '',
    formatConversation(flow, answers),
  ].join('\n')

  await transporter.sendMail({
    from,
    to: MAIL_TO,
    subject: `Ruhi · ${answers.length} ${answers.length === 1 ? 'reply' : 'replies'} · ${lastLabel}`,
    text: body,
  })
}
