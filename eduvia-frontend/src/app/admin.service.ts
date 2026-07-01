import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:3001';

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface AdminUserItem {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  needsSupport?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAdminUserPayload {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface UpdateAdminUserPayload {
  email?: string;
  password?: string;
  name?: string;
  role?: UserRole;
  needsSupport?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  constructor(private http: HttpClient) {}

  getUsers(): Observable<AdminUserItem[]> {
    return this.http.get<AdminUserItem[]>(`${API_URL}/users`);
  }

  createUser(payload: CreateAdminUserPayload): Observable<AdminUserItem> {
    return this.http.post<AdminUserItem>(`${API_URL}/users`, payload);
  }

  updateUser(id: string, payload: UpdateAdminUserPayload): Observable<AdminUserItem> {
    return this.http.patch<AdminUserItem>(`${API_URL}/users/${id}`, payload);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/users/${id}`);
  }

  getAnalyticsOverview(): Observable<any> {
    return this.http.get<any>(`${API_URL}/analytics/overview`);
  }

  getAnalyticsUsers(): Observable<any> {
    return this.http.get<any>(`${API_URL}/analytics/users`);
  }

  getAnalyticsLearning(): Observable<any> {
    return this.http.get<any>(`${API_URL}/analytics/learning`);
  }

  getAnalyticsEngagement(): Observable<any> {
    return this.http.get<any>(`${API_URL}/analytics/engagement`);
  }
}
