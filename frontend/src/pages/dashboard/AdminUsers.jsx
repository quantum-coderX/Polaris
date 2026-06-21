import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Search, CheckCircle, XCircle, Shield, BookOpen, GraduationCap, Loader2 } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const ROLES = [
  { value: '', label: 'All Users', icon: Users },
  { value: 'student', label: 'Students', icon: GraduationCap },
  { value: 'mentor', label: 'Mentors', icon: BookOpen },
  { value: 'admin', label: 'Admins', icon: Shield },
]

export default function AdminUsers() {
  const qc = useQueryClient()
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter, search],
    queryFn: () => {
      const params = new URLSearchParams()
      if (roleFilter) params.set('role', roleFilter)
      if (search) params.set('search', search)
      params.set('limit', '50')
      return api.get(`/admin/users?${params}`).then(r => r.data)
    },
  })

  const approveMentor = useMutation({
    mutationFn: (id) => api.post(`/users/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('Mentor approved!') },
  })

  const deactivateUser = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('User deactivated') },
  })

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
  }

  const users = data?.users ?? []
  const total = data?.total ?? 0

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-heading text-white mb-1">User Management</h1>
      <p className="text-gray-400 mb-6">View and manage all platform users</p>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="admin-user-search"
              className="form-input pl-9"
              placeholder="Search by name, email, or username&hellip;"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">Search</button>
        </form>
      </div>

      {/* Role Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ROLES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            className={`btn btn-sm ${roleFilter === value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setRoleFilter(value)}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">{total} user{total !== 1 ? 's' : ''} found</span>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      )}

      {/* Users Table */}
      {!isLoading && (
        <div className="admin-users-table-wrap">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-500 py-8">No users found.</td></tr>
              )}
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="admin-user-avatar">
                        {(user.full_name ?? 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">{user.full_name}</div>
                        <div className="text-xs text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm text-gray-400">{user.email}</td>
                  <td>
                    <span className={`badge ${
                      user.role === 'admin' ? 'badge-warning' :
                      user.role === 'mentor' ? 'badge-primary' :
                      'badge-success'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    {!user.is_active ? (
                      <span className="badge badge-danger">Deactivated</span>
                    ) : user.role === 'mentor' && !user.is_approved ? (
                      <span className="badge badge-warning">Pending</span>
                    ) : (
                      <span className="badge badge-success">Active</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      {user.role === 'mentor' && !user.is_approved && user.is_active && (
                        <button
                          className="btn btn-sm"
                          style={{ background: 'rgba(0,212,200,0.15)', color: 'var(--color-secondary)', border: '1px solid rgba(0,212,200,0.3)' }}
                          onClick={() => approveMentor.mutate(user.id)}
                        >
                          <CheckCircle size={13} /> Approve
                        </button>
                      )}
                      {user.is_active && user.role !== 'admin' && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            if (window.confirm(`Deactivate ${user.full_name}?`)) {
                              deactivateUser.mutate(user.id)
                            }
                          }}
                        >
                          <XCircle size={13} /> Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
