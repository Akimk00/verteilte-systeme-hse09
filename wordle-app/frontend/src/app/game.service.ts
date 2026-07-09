import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WordResponse {
  word: string;
  hint: string;
}

@Injectable({ providedIn: 'root' })
export class GameService {

  // relative URL: dev server proxies it, in Docker/Kubernetes nginx proxies it
  private readonly apiUrl = '/api';

  constructor(private http: HttpClient) {}

  getWord(): Observable<WordResponse> {
    return this.http.get<WordResponse>(`${this.apiUrl}/word`);
  }
}
