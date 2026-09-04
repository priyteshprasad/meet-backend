import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { requireSupabaseEnv, supabaseServiceKey, supabaseUrl } from './config.js'

requireSupabaseEnv()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const flowPath = path.join(__dirname, '..', 'data', 'flow2.json')

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function throwIfError(error) {
  if (error) throw error
}

export async function getFlow() {
  const fromFile = fs.readFileSync(flowPath, 'utf8')
  const parsed = JSON.parse(fromFile)
  const { error } = await supabase.from('flow').upsert({
    id: 1,
    json: parsed,
    updated_at: new Date().toISOString(),
  })
  throwIfError(error)
  return parsed
}

export async function saveFlow(flow) {
  const json = JSON.stringify(flow, null, 2)
  fs.writeFileSync(flowPath, json)
  const { error } = await supabase.from('flow').upsert({
    id: 1,
    json: flow,
    updated_at: new Date().toISOString(),
  })
  throwIfError(error)
  return flow
}

export async function createSession(startNode) {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const { error } = await supabase.from('sessions').insert({
    id,
    current_node: startNode,
    started_at: now,
    updated_at: now,
  })
  throwIfError(error)
  return { id, currentNode: startNode }
}

export async function getSession(id) {
  const { data, error } = await supabase.from('sessions').select('*').eq('id', id).maybeSingle()
  throwIfError(error)
  return data
}
export async function isAnswerSubmitted(){
  const { data, error } = await supabase.from('submission').select('*').limit(1)
  throwIfError(error)
  return data
}
export async function markAnswerSubmitted(){
  const id = crypto.randomUUID()
  const {data, error} = await supabase.from('submission').insert({id, submitted: true, updated_at: new Date().toISOString()})
  throwIfError(error)
  return data
}

export async function recordChoice({ sessionId, nodeId, optionId, nextNode, inputText, isEnd }) {
  const now = new Date().toISOString()
  const { error: answerError } = await supabase.from('answers').insert({
    session_id: sessionId,
    node_id: nodeId,
    option_id: optionId,
    input_text: inputText ?? null,
    created_at: now,
  })
  throwIfError(answerError)

  const { error: sessionError } = await supabase
    .from('sessions')
    .update({
      current_node: nextNode,
      updated_at: now,
      ...(isEnd ? { ended_at: now } : {}),
    })
    .eq('id', sessionId)
  throwIfError(sessionError)

  if(isEnd){
    await markAnswerSubmitted()
  }
}

export async function getAnswers(sessionId) {
  const { data, error } = await supabase
    .from('answers')
    .select('node_id, option_id, input_text, created_at')
    .eq('session_id', sessionId)
    .order('id', { ascending: true })
  throwIfError(error)
  return data ?? []
}
