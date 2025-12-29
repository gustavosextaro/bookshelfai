import { supabase } from './supabaseClient'

async function callFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body ?? {}
  })

  if (error) {
    // Supabase FunctionsHttpError often hides the response body in `context`
    let msg = error.message || 'Erro ao chamar função'

    if (error.context && error.context.error) {
      // My edge function returns { error: '...' }
      msg = error.context.error
    } else if (error.context && typeof error.context === 'string') {
      msg = error.context
    }

    const err = new Error(msg)
    err.details = error.context || error
    throw err
  }

  return data
}

export async function saveAiSettings({ provider, apiKey }) {
  return callFunction('ai-settings-save', { provider, apiKey })
}

export async function runAiAction({ actionType, input }) {
  return callFunction('ai-action-run', { actionType, input })
}

export async function getAiSettings() {
  return callFunction('get-user-settings', {})
}
