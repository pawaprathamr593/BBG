import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/http/api.service';
import { ApiError } from '../../core/http/api-error';
import { ApiEnvelope } from '../../core/http/api.models';
import { WorkspaceAction } from './workspace.config';

@Injectable({ providedIn: 'root' })
export class WorkspaceApiService {
  private readonly api = inject(ApiService);

  async execute(action: WorkspaceAction, actionData: Record<string, unknown>): Promise<unknown> {
    const body = {
      [action.envelope]: {
        actionType: action.actionType,
        actionData,
      },
    };
    const response = await firstValueFrom(this.api.post<unknown>(action.path, body));
    this.assertSuccess(response, action.label);
    return response.data;
  }

  private assertSuccess(response: ApiEnvelope<unknown>, label: string): void {
    if (response.status !== 'SUCCESS') {
      throw new ApiError(response.msgArr?.join(' ') || `${label} could not be completed.`, null, response.msgArr ?? []);
    }
  }
}
