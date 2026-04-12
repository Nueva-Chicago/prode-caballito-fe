import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import type { Planilla } from '@/types'
import { TEAM_THEMES } from '@/types'

export function Profile() {
  const { user, updateUser } = useAuthStore()
  const { show } = useToastStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [planillas, setPlanillas] = useState<Planilla[]>([])
  const [loading, setLoading] = useState(true)
  const [editName, setEditName] = useState(false)
  const [nombre, setNombre] = useState(user?.nombre || '')
  const [showNewPlanilla, setShowNewPlanilla] = useState(false)
  const [newPlanillaName, setNewPlanillaName] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => {
    if (!user) return
    api.get('/planillas').then(({ data }) => setPlanillas(data.data)).finally(() => setLoading(false))
  }, [user])

  const handleSaveName = async () => {
    try {
      await api.put(`/users/${user!.id}`, { nombre })
      updateUser({ nombre })
      setEditName(false)
      show('Nombre actualizado', 'success')
    } catch {
      show('Error al actualizar', 'error')
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const { data } = await api.post('/users/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      updateUser({ foto_url: data.data.foto_url })
      show('Foto actualizada ✓', 'success')
    } catch {
      show('Error al subir foto', 'error')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleCreatePlanilla = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await api.post('/planillas', { nombre_planilla: newPlanillaName })
      setPlanillas([...planillas, data.data])
      setShowNewPlanilla(false)
      setNewPlanillaName('')
      show('Planilla creada ✓', 'success')
    } catch {
      show('Error al crear planilla', 'error')
    }
  }

  const handleDeletePlanilla = async (id: string) => {
    if (!confirm('¿Eliminar esta planilla? Se perderán todos los pronósticos.')) return
    try {
      await api.delete(`/planillas/${id}`)
      setPlanillas(planillas.filter(p => p.id !== id))
      show('Planilla eliminada', 'info')
    } catch {
      show('Error al eliminar', 'error')
    }
  }

  const handleThemeChange = async (tema: string) => {
    try {
      await api.put(`/users/${user!.id}`, { tema_equipo: tema })
      updateUser({ tema_equipo: tema })
      localStorage.setItem('tema_equipo', tema)
      show(`Tema ${TEAM_THEMES[tema]?.name} activado ✓`, 'success')
    } catch {
      show('Error al cambiar tema', 'error')
    }
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-[#001A4B]">Mi Perfil</h1>

      {/* Foto y nombre */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-5">
          <div className="relative cursor-pointer" onClick={() => fileRef.current?.click()}>
            {user.foto_url
              ? <img src={user.foto_url} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-[#0042A5]/20" />
              : <div className="w-20 h-20 rounded-full bg-[#0042A5] flex items-center justify-center text-3xl text-white font-bold">
                  {user.nombre[0].toUpperCase()}
                </div>
            }
            <div className="absolute bottom-0 right-0 bg-[#FFDF00] rounded-full p-1 shadow text-sm">
              {uploadingPhoto ? '⏳' : '📷'}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <div className="flex-1 min-w-0">
            {editName ? (
              <div className="flex gap-2">
                <input value={nombre} onChange={(e) => setNombre(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042A5]" />
                <button onClick={handleSaveName} className="bg-[#0042A5] text-white px-3 py-1.5 rounded-lg text-sm font-medium">Guardar</button>
                <button onClick={() => setEditName(false)} className="text-gray-400 text-sm px-2">×</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#001A4B] truncate">{user.nombre}</h2>
                <button onClick={() => setEditName(true)} className="text-gray-400 hover:text-gray-600 text-sm">✏️</button>
              </div>
            )}
            <p className="text-sm text-gray-400 mt-0.5">{user.email}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${user.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {user.rol}
            </span>
          </div>
        </div>
      </div>

      {/* Tema de equipo */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-bold text-[#001A4B] mb-3">🎨 Tema Visual</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(TEAM_THEMES).map(([key, theme]) => (
            <button
              key={key}
              onClick={() => handleThemeChange(key)}
              className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${user.tema_equipo === key ? 'border-[#0042A5] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
              style={{ borderLeftColor: theme.primary, borderLeftWidth: 4 }}
            >
              {theme.name}
            </button>
          ))}
        </div>
      </div>

      {/* Planillas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#001A4B]">📋 Mis Planillas</h3>
          <button onClick={() => setShowNewPlanilla(true)}
            className="bg-[#FFDF00] text-[#001A4B] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-yellow-400 transition-colors">
            + Nueva
          </button>
        </div>
        {loading ? <Spinner size="sm" /> : (
          <div className="space-y-2">
            {planillas.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No tenés planillas todavía</p>}
            {planillas.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <Link to={`/planilla/${p.id}`} className="flex-1 min-w-0 hover:opacity-80">
                  <p className="text-sm font-semibold text-[#001A4B]">{p.nombre_planilla}</p>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{p.puntos_totales || 0} pts</span>
                    <span className={`text-xs px-1.5 rounded font-medium ${p.precio_pagado ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                      {p.precio_pagado ? 'Pagada' : 'Sin pagar'}
                    </span>
                  </div>
                </Link>
                <button onClick={() => handleDeletePlanilla(p.id)} className="text-gray-300 hover:text-red-400 transition-colors text-lg ml-2">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal nueva planilla */}
      <Modal open={showNewPlanilla} onClose={() => setShowNewPlanilla(false)} title="Nueva Planilla">
        <form onSubmit={handleCreatePlanilla} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la planilla</label>
            <input
              type="text"
              value={newPlanillaName}
              onChange={(e) => setNewPlanillaName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0042A5] text-sm"
              placeholder="Mi planilla 2026"
              required
            />
          </div>
          <button type="submit"
            className="w-full bg-[#0042A5] text-white font-bold py-2.5 rounded-xl hover:bg-[#003080] transition-colors">
            Crear planilla
          </button>
        </form>
      </Modal>
    </div>
  )
}
