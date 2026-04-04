import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  get<T>(url: string, params?: any): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<T>(url, { params: httpParams });
  }

  post<T>(url: string, body: any): Observable<T> {
    return this.http.post<T>(url, body);
  }

  put<T>(url: string, body: any): Observable<T> {
    return this.http.put<T>(url, body);
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(url);
  }

  upload<T>(url: string, file: File, fieldName = 'file'): Observable<T> {
    const formData = new FormData();
    formData.append(fieldName, file);
    return this.http.post<T>(url, formData);
  }

  downloadPdf(url: string, filename: string, params?: any): void {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    this.http.get(url, { params: httpParams, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(blobUrl);
      },
      error: () => {
        console.error('PDF download failed');
      }
    });
  }

  openPdf(url: string, params?: any): void {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    this.http.get(url, { params: httpParams, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      },
      error: () => {
        console.error('PDF open failed');
      }
    });
  }
}
