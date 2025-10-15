import Store from 'electron-store'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

interface User {
  id: string
  name: string
  email: string
  passwordHash: string
  createdAt: string
}

const store = new Store<{ user: User | null }>({
  name: 'snapflow-auth',
  defaults: {
    user: null,
  },
})

export class AuthService {
  async createUser(name: string, email: string, password: string): Promise<Omit<User, 'passwordHash'>> {
    const existingUser = store.get('user')
    if (existingUser) {
      throw new Error('User already exists')
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user: User = {
      id: uuidv4(),
      name,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    }

    store.set('user', user)

    const { passwordHash: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  async login(email: string, password: string): Promise<Omit<User, 'passwordHash'>> {
    const user = store.get('user')
    if (!user) {
      throw new Error('User not found')
    }

    if (user.email !== email) {
      throw new Error('Invalid email or password')
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      throw new Error('Invalid email or password')
    }

    const { passwordHash: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  getUser(): Omit<User, 'passwordHash'> | null {
    const user = store.get('user')
    if (!user) {
      return null
    }

    const { passwordHash: _, ...userWithoutPassword } = user
    return userWithoutPassword
  }

  hasUser(): boolean {
    return store.get('user') !== null
  }

  async updateUser(updates: Partial<Pick<User, 'name' | 'email'>>): Promise<Omit<User, 'passwordHash'>> {
    const user = store.get('user')
    if (!user) {
      throw new Error('User not found')
    }

    const updatedUser = {
      ...user,
      ...updates,
    }

    store.set('user', updatedUser)

    const { passwordHash: _, ...userWithoutPassword } = updatedUser
    return userWithoutPassword
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = store.get('user')
    if (!user) {
      throw new Error('User not found')
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isValidPassword) {
      throw new Error('Invalid current password')
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10)
    user.passwordHash = newPasswordHash
    store.set('user', user)
  }

  logout(): void {
    // For now, we don't delete the user, just signal logout
    // You can implement session-based auth here if needed
    // For a local desktop app, we keep the user stored
  }

  deleteUser(): void {
    store.delete('user')
  }
}

export const authService = new AuthService()
