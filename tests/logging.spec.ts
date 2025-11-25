import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  // Logger
  logger,
  LogLevel,
  LogDestination,
  type LogEntry,
  // Log Context
  createLogContext,
  cloneLogContext,
  addMetadata,
  formatContext,
  contextStore,
} from '../src';

describe('Logging Module', () => {
  describe('Log Context', () => {
    beforeEach(() => {
      contextStore.clear();
    });

    describe('createLogContext()', () => {
      it('should create context with generated correlation ID', () => {
        const ctx = createLogContext();
        expect(ctx.correlationId).toBeDefined();
        expect(ctx.correlationId.length).toBeGreaterThan(0);
        expect(ctx.metadata).toEqual({});
      });

      it('should create context with provided initial values', () => {
        const ctx = createLogContext({
          tenantId: 'tenant-1',
          storeId: 'store-1',
          userId: 'user-1',
          operation: 'test-op',
          metadata: { key: 'value' },
        });

        expect(ctx.tenantId).toBe('tenant-1');
        expect(ctx.storeId).toBe('store-1');
        expect(ctx.userId).toBe('user-1');
        expect(ctx.operation).toBe('test-op');
        expect(ctx.metadata).toEqual({ key: 'value' });
      });
    });

    describe('cloneLogContext()', () => {
      it('should clone context with overrides', () => {
        const original = createLogContext({ tenantId: 'tenant-1', userId: 'user-1' });
        const cloned = cloneLogContext(original, { userId: 'user-2' });

        expect(cloned.correlationId).toBe(original.correlationId);
        expect(cloned.tenantId).toBe('tenant-1');
        expect(cloned.userId).toBe('user-2');
      });

      it('should merge metadata', () => {
        const original = createLogContext({ metadata: { a: 1 } });
        const cloned = cloneLogContext(original, { metadata: { b: 2 } });

        expect(cloned.metadata).toEqual({ a: 1, b: 2 });
      });
    });

    describe('addMetadata()', () => {
      it('should add metadata to context', () => {
        const ctx = createLogContext();
        const updated = addMetadata(ctx, 'key', 'value');

        expect(updated.metadata['key']).toBe('value');
        expect(ctx.metadata['key']).toBeUndefined(); // Original unchanged
      });
    });

    describe('formatContext()', () => {
      it('should format context for logging', () => {
        const ctx = createLogContext({
          tenantId: 'tenant-1',
          storeId: 'store-1',
          userId: 'user-1',
          operation: 'test-op',
        });

        const formatted = formatContext(ctx);

        expect(formatted).toContain(ctx.correlationId);
        expect(formatted).toContain('tenant:tenant-1');
        expect(formatted).toContain('store:store-1');
        expect(formatted).toContain('user:user-1');
        expect(formatted).toContain('op:test-op');
      });
    });

    describe('contextStore', () => {
      it('should set and get current context', () => {
        const ctx = createLogContext({ tenantId: 'tenant-1' });
        contextStore.set(ctx);

        expect(contextStore.get()).toBe(ctx);
        expect(contextStore.get()).not.toBeNull();
      });

      it('should clear context', () => {
        const ctx = createLogContext();
        contextStore.set(ctx);
        contextStore.clear();

        expect(contextStore.get()).toBeNull();
      });

      it('should get or create context', () => {
        expect(contextStore.get()).toBeNull();

        const ctx = contextStore.getOrCreate();
        expect(ctx).toBeDefined();
        expect(contextStore.get()).toBe(ctx);
      });

      it('should run function with context', () => {
        const ctx = createLogContext({ tenantId: 'run-tenant' });

        const result = contextStore.run(ctx, () => {
          expect(contextStore.get()?.tenantId).toBe('run-tenant');
          return 'result';
        });

        expect(result).toBe('result');
        expect(contextStore.get()).toBeNull(); // Context restored
      });

      it('should run async function with context', async () => {
        const ctx = createLogContext({ tenantId: 'async-tenant' });

        const result = await contextStore.runAsync(ctx, async () => {
          expect(contextStore.get()?.tenantId).toBe('async-tenant');
          return 'async-result';
        });

        expect(result).toBe('async-result');
        expect(contextStore.get()).toBeNull();
      });
    });
  });

  describe('Logger', () => {
    let logEntries: LogEntry[] = [];

    beforeEach(() => {
      logEntries = [];
      logger.configure({
        minLevel: LogLevel.DEBUG,
        destinations: [LogDestination.CONSOLE],
        jsonFormat: false,
        customHandler: (entry: LogEntry) => {
          logEntries.push(entry);
        },
      });
      contextStore.clear();
    });

    afterEach(() => {
      logger.resetConfig();
    });

    describe('start() / end()', () => {
      it('should log operation start', () => {
        logger.start('test-operation');

        expect(logEntries.length).toBe(1);
        expect(logEntries[0]?.operation).toBe('test-operation');
        expect(logEntries[0]?.message).toContain('Starting');
        expect(logEntries[0]?.level).toBe(LogLevel.INFO);
      });

      it('should log operation end with duration', async () => {
        logger.start('test-operation');
        await new Promise((resolve) => setTimeout(resolve, 10));
        logger.end('test-operation');

        expect(logEntries.length).toBe(2);
        expect(logEntries[1]?.message).toContain('Completed');
        expect(logEntries[1]?.duration).toBeDefined();
        expect(logEntries[1]?.duration).toBeGreaterThanOrEqual(0);
      });

      it('should include context in logs', () => {
        const ctx = createLogContext({ tenantId: 'tenant-1' });
        logger.start('test-op', ctx);

        expect(logEntries[0]?.correlationId).toBe(ctx.correlationId);
        expect(logEntries[0]?.context?.['tenantId']).toBe('tenant-1');
      });
    });

    describe('error()', () => {
      it('should log error with details', () => {
        const error = new Error('Test error');
        logger.error('test-operation', null, error);

        expect(logEntries.length).toBe(1);
        expect(logEntries[0]?.level).toBe(LogLevel.ERROR);
        expect(logEntries[0]?.error?.name).toBe('Error');
        expect(logEntries[0]?.error?.message).toBe('Test error');
      });

      it('should handle string errors', () => {
        logger.error('test-operation', null, 'String error message');

        expect(logEntries[0]?.error?.message).toBe('String error message');
      });
    });

    describe('debug() / info() / warn()', () => {
      it('should log debug messages', () => {
        logger.debug('test-op', 'Debug message');
        expect(logEntries[0]?.level).toBe(LogLevel.DEBUG);
        expect(logEntries[0]?.message).toBe('Debug message');
      });

      it('should log info messages', () => {
        logger.info('test-op', 'Info message');
        expect(logEntries[0]?.level).toBe(LogLevel.INFO);
      });

      it('should log warn messages', () => {
        logger.warn('test-op', 'Warning message');
        expect(logEntries[0]?.level).toBe(LogLevel.WARN);
      });
    });

    describe('log level filtering', () => {
      it('should filter logs below minimum level', () => {
        logger.configure({
          minLevel: LogLevel.WARN,
          customHandler: (entry: LogEntry) => {
            logEntries.push(entry);
          },
        });

        logger.debug('op', 'Debug');
        logger.info('op', 'Info');
        logger.warn('op', 'Warn');
        logger.error('op', null, 'Error');

        expect(logEntries.length).toBe(2);
        expect(logEntries[0]?.level).toBe(LogLevel.WARN);
        expect(logEntries[1]?.level).toBe(LogLevel.ERROR);
      });
    });

    describe('createChildLogger()', () => {
      it('should create logger with preset context', () => {
        const childLogger = logger.createChildLogger({
          tenantId: 'child-tenant',
          userId: 'child-user',
        });

        childLogger.info('child-op', 'Child message');

        expect(logEntries[0]?.context?.['tenantId']).toBe('child-tenant');
        expect(logEntries[0]?.context?.['userId']).toBe('child-user');
        expect(logEntries[0]?.correlationId).toBe(childLogger.context.correlationId);
      });

      it('should allow additional context on individual logs', () => {
        const childLogger = logger.createChildLogger({ tenantId: 'tenant-1' });
        childLogger.info('op', 'Message', { extra: 'data' });

        expect(logEntries[0]?.context?.['tenantId']).toBe('tenant-1');
        expect(logEntries[0]?.context?.['extra']).toBe('data');
      });
    });

    describe('JSON format', () => {
      it('should output JSON when configured', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        
        logger.configure({
          minLevel: LogLevel.INFO,
          destinations: [LogDestination.CONSOLE],
          jsonFormat: true,
          customHandler: undefined,
        });

        logger.info('test-op', 'Test message');

        expect(consoleSpy).toHaveBeenCalled();
        const output = consoleSpy.mock.calls[0]?.[0];
        expect(output).toBeDefined();
        
        const parsed = JSON.parse(output as string);
        expect(parsed.operation).toBe('test-op');
        expect(parsed.message).toBe('Test message');

        consoleSpy.mockRestore();
      });
    });
  });
});
