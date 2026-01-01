import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'
import type { Project, EngineType } from '@/types'

/**
 * Project Repository
 * Data access layer for project management
 */
export const ProjectRepository = {
  /**
   * Create a new project
   */
  async create(data: {
    title: string
    engineType: EngineType
    thumbnail?: string
  }): Promise<Project> {
    const now = new Date()
    const project: Project = {
      id: uuidv4(),
      title: data.title,
      engineType: data.engineType,
      thumbnail: data.thumbnail || '',
      createdAt: now,
      updatedAt: now,
    }

    await db.projects.add(project)
    return project
  },

  /**
   * 保存/更新后端返回的项目（以远端 ID 为主）
   */
  async upsertRemote(remote: Partial<Project> & { id: string }, fallback?: Project): Promise<Project> {
    const now = new Date()
    const remoteUpdated =
      remote.updatedAt
        ? new Date(remote.updatedAt)
        : (remote as any)['updateTime']
          ? new Date((remote as any)['updateTime'])
          : now
    const remoteCreated =
      remote.createdAt
        ? new Date(remote.createdAt)
        : fallback?.createdAt || now
    const remoteSyncedAt =
      remote.remoteSyncedAt
        ? new Date(remote.remoteSyncedAt)
        : remoteUpdated
    const project: Project = {
      id: remote.id,
      remoteId: remote.id,
      title: remote.title || fallback?.title || '未命名',
      engineType: (remote.engineType as EngineType) || fallback?.engineType || 'mermaid',
      thumbnail: remote.thumbnail || fallback?.thumbnail || '',
      createdAt: remoteCreated,
      updatedAt: remoteUpdated,
      remoteSyncedAt,
    }
    await db.projects.put(project)
    return project
  },

  /**
   * Get project by ID
   */
  async getById(id: string): Promise<Project | undefined> {
    return db.projects.get(id)
  },

  /**
   * Get all projects, sorted by updatedAt descending
   */
  async getAll(): Promise<Project[]> {
    return db.projects.orderBy('updatedAt').reverse().toArray()
  },

  /**
   * Update project
   */
  async update(
    id: string,
    data: Partial<Omit<Project, 'id' | 'createdAt'>>
  ): Promise<void> {
    await db.projects.update(id, {
      ...data,
      updatedAt: new Date(),
    })
  },

  /**
   * Delete project and its version history
   */
  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.projects, db.versionHistory], async () => {
      // Delete all version history for this project
      await db.versionHistory.where('projectId').equals(id).delete()
      // Delete the project
      await db.projects.delete(id)
    })
  },

  /**
   * Search projects by title keyword
   */
  async search(keyword: string): Promise<Project[]> {
    const lowerKeyword = keyword.toLowerCase()
    return db.projects
      .filter((project) => project.title.toLowerCase().includes(lowerKeyword))
      .reverse()
      .sortBy('updatedAt')
  },
}
