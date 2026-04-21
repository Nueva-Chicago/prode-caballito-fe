import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'
import { useT } from '@/hooks/useT'
import { Spinner } from '@/components/ui/Spinner'
import type { Message } from '@/types'

interface UserPreview { id: string; nombre: string; foto_url?: string; unread?: number }

export function Messages() {
  const { userId } = useParams()
  const { user } = useAuthStore()
  const { show } = useToastStore()
  const t = useT()
  const [users, setUsers] = useState<UserPreview[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const selectedUser = users.find(u => u.id === userId)

  useEffect(() => {
    api.get('/messages/users').then(({ data }) => setUsers(data.data || []))
      .catch(() => show(t.messages.errorLoad, 'error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!userId) return
    api.get(`/messages/${userId}`).then(({ data }) => {
      setMessages(data.data || [])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    })
  }, [userId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || !userId) return
    setSending(true)
    try {
      const { data } = await api.post(`/messages/${userId}`, { content: text.trim() })
      setMessages([...messages, data.data])
      setText('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch {
      show(t.messages.errorSend, 'error')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-3.5rem)] flex">
      {/* Sidebar */}
      <div className={`${userId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 border-r border-gray-100 bg-white`}>
        <div className="p-4 border-b">
          <h2 className="font-bold text-[#001A4B]">{t.messages.title}</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {users.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">{t.messages.noConversations}</p>
          )}
          {users.map((u) => (
            <Link
              key={u.id}
              to={`/messages/${u.id}`}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${userId === u.id ? 'bg-blue-50' : ''}`}
            >
              <div className="w-9 h-9 rounded-full bg-[#0042A5] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {u.nombre[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#001A4B] truncate">{u.nombre}</p>
              </div>
              {u.unread && u.unread > 0 && (
                <span className="bg-[#0042A5] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0">
                  {u.unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Chat */}
      {userId ? (
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white border-b shadow-sm">
            <Link to="/messages" className="md:hidden -ml-1 flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors shrink-0" aria-label="Volver">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#001A4B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div className="w-8 h-8 rounded-full bg-[#0042A5] flex items-center justify-center text-white font-bold text-sm">
              {selectedUser?.nombre[0].toUpperCase() || '?'}
            </div>
            <span className="font-semibold text-[#001A4B]">{selectedUser?.nombre || '...'}</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {messages.map((m) => {
              const isMe = m.sender_id === user?.id
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs md:max-w-md px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-[#0042A5] text-white rounded-br-sm' : 'bg-white text-[#001A4B] shadow-sm rounded-bl-sm'}`}>
                    {m.content}
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                      {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 bg-white border-t">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t.messages.placeholder}
              className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]"
            />
            <button type="submit" disabled={sending || !text.trim()}
              className="bg-[#0042A5] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#003080] disabled:opacity-50 transition-colors">
              {sending ? '...' : '→'}
            </button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">{t.messages.selectConversation}</p>
          </div>
        </div>
      )}
    </div>
  )
}
