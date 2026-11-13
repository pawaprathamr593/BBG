import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiError } from '../../core/http/api-error';
import { WorkspaceApiService } from './workspace-api.service';
import { WorkspaceAction, WorkspaceConfig, WorkspaceSection } from './workspace.config';

@Component({
  selector: 'app-workspace',
  imports: [FormsModule, JsonPipe],
  templateUrl: './workspace.html',
  styleUrl: './workspace.scss',
})
export class Workspace implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(WorkspaceApiService);
  protected readonly config = this.route.snapshot.data['workspace'] as WorkspaceConfig;
  protected readonly activeSectionId = signal(this.config.sections[0]?.id ?? '');
  protected readonly activeSection = computed(
    () => this.config.sections.find((section) => section.id === this.activeSectionId()) ?? this.config.sections[0],
  );
  protected readonly activeAction = signal<WorkspaceAction | null>(this.activeSection()?.actions[0] ?? null);
  protected readonly payload = signal('{
  
}');
  protected readonly result = signal<unknown>(null);
  protected readonly hasResult = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  ngOnInit(): void {
    const initial = this.activeAction();
    if (initial && !initial.requiresPayload) void this.run(initial);
  }

  protected selectSection(section: WorkspaceSection): void {
    this.activeSectionId.set(section.id);
    this.activeAction.set(section.actions[0] ?? null);
    this.result.set(null);
    this.hasResult.set(false);
    this.error.set('');
    this.notice.set('');
    this.payload.set('{
  
}');
    const first = section.actions[0];
    if (first && !first.requiresPayload) void this.run(first);
  }

  protected selectAction(action: WorkspaceAction): void {
    this.activeAction.set(action);
    this.result.set(null);
    this.hasResult.set(false);
    this.error.set('');
    this.notice.set('');
  }

  protected async run(action = this.activeAction()): Promise<void> {
    if (!action || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      let data: Record<string, unknown> = {};
      if (action.requiresPayload) {
        const parsed: unknown = JSON.parse(this.payload());
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Enter a JSON object for the request payload.');
        }
        data = parsed as Record<string, unknown>;
        if (Object.keys(data).length === 0) {
          throw new Error('This action requires request fields. Add the fields defined by the backend contract before submitting.');
        }
      }
      const response = await this.api.execute(action, data);
      this.result.set(response);
      this.hasResult.set(true);
      this.notice.set(`${action.label} completed successfully.`);
    } catch (cause) {
      this.error.set(cause instanceof ApiError || cause instanceof Error
        ? cause.message
        : 'The request could not be completed.');
    } finally {
      this.loading.set(false);
    }
  }

  protected isRecord(value: unknown): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  protected isPrimitive(value: unknown): boolean {
    return value === null || ['string', 'number', 'boolean'].includes(typeof value);
  }

  protected resultEntries(value: unknown): [string, unknown][] {
    return this.isRecord(value) ? Object.entries(value as Record<string, unknown>) : [];
  }
}
