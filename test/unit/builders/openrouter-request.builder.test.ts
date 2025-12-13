import { describe, it, expect, beforeEach } from 'vitest';
import { OpenRouterRequestBuilder } from '../../../src/lib/builders/openrouter-request.builder';
import type { 
  ResponseSchema,
  MessageContent,
  ModelParameters 
} from '../../../src/types/openrouter.types';

/**
 * Unit tests for OpenRouterRequestBuilder
 * 
 * Tests cover:
 * - withModel() - setting model
 * - withSystemMessage() - adding system messages
 * - withUserMessage() - adding user messages (string and multimodal)
 * - withResponseSchema() - setting response schema
 * - withParameters() - setting optional parameters
 * - build() - validation and building request
 * - reset() - resetting builder state
 * - Method chaining for fluent API
 */
describe('OpenRouterRequestBuilder', () => {
  let builder: OpenRouterRequestBuilder;

  beforeEach(() => {
    builder = new OpenRouterRequestBuilder();
  });

  describe('withModel()', () => {
    it('should set model', () => {
      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('Test message')
        .build();

      // Assert
      expect(result.model).toBe('openai/gpt-4o-mini');
    });

    it('should allow method chaining', () => {
      // Act
      const returnValue = builder.withModel('openai/gpt-4o-mini');

      // Assert
      expect(returnValue).toBe(builder);
    });

    it('should overwrite previous model', () => {
      // Act
      builder
        .withModel('openai/gpt-3.5-turbo')
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('test')
        .build();

      // Assert - build would fail if model wasn't set correctly
      const result = builder.build();
      expect(result.model).toBe('openai/gpt-4o-mini');
    });
  });

  describe('withSystemMessage()', () => {
    it('should add system message', () => {
      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withSystemMessage('You are a helpful assistant')
        .withUserMessage('Hello')
        .build();

      // Assert
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant',
      });
    });

    it('should initialize messages array if empty', () => {
      // Act
      builder.withSystemMessage('System prompt');
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('User message')
        .build();

      // Assert
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
    });

    it('should allow method chaining', () => {
      // Act
      const returnValue = builder.withSystemMessage('Test');

      // Assert
      expect(returnValue).toBe(builder);
    });

    it('should allow multiple system messages', () => {
      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withSystemMessage('First system message')
        .withSystemMessage('Second system message')
        .withUserMessage('User message')
        .build();

      // Assert
      expect(result.messages).toHaveLength(3);
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[0].content).toBe('First system message');
      expect(result.messages[1].role).toBe('system');
      expect(result.messages[1].content).toBe('Second system message');
    });
  });

  describe('withUserMessage()', () => {
    it('should add user message as string', () => {
      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('Hello, how are you?')
        .build();

      // Assert
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toEqual({
        role: 'user',
        content: 'Hello, how are you?',
      });
    });

    it('should add user message as MessageContent array (multimodal)', () => {
      // Arrange
      const multimodalMessage: MessageContent[] = [
        { type: 'text', text: 'What is in this image?' },
        { type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } },
      ];

      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage(multimodalMessage)
        .build();

      // Assert
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toEqual({
        role: 'user',
        content: multimodalMessage,
      });
    });

    it('should allow method chaining', () => {
      // Act
      const returnValue = builder.withUserMessage('Test');

      // Assert
      expect(returnValue).toBe(builder);
    });

    it('should allow multiple user messages', () => {
      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('First question')
        .withUserMessage('Second question')
        .build();

      // Assert
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toBe('First question');
      expect(result.messages[1].content).toBe('Second question');
    });
  });

  describe('withResponseSchema()', () => {
    it('should set response format with schema', () => {
      // Arrange
      const schema: ResponseSchema = {
        name: 'receipt_response',
        schema: {
          type: 'object',
          properties: {
            items: { type: 'array' },
            total: { type: 'number' },
          },
        },
      };

      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('Process receipt')
        .withResponseSchema(schema)
        .build();

      // Assert
      expect(result.response_format).toBeDefined();
      expect(result.response_format?.type).toBe('json_schema');
    });

    it('should build proper json_schema structure', () => {
      // Arrange
      const schema: ResponseSchema = {
        name: 'test_schema',
        schema: {
          type: 'object',
          properties: {
            field: { type: 'string' },
          },
        },
      };

      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('Test')
        .withResponseSchema(schema)
        .build();

      // Assert
      expect(result.response_format?.json_schema).toEqual({
        name: 'test_schema',
        strict: true,
        schema: schema.schema,
      });
    });

    it('should set strict: true in json_schema', () => {
      // Arrange
      const schema: ResponseSchema = {
        name: 'strict_schema',
        schema: { type: 'object' },
      };

      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('Test')
        .withResponseSchema(schema)
        .build();

      // Assert
      expect(result.response_format?.json_schema?.strict).toBe(true);
    });

    it('should allow method chaining', () => {
      // Arrange
      const schema: ResponseSchema = {
        name: 'test',
        schema: { type: 'object' },
      };

      // Act
      const returnValue = builder.withResponseSchema(schema);

      // Assert
      expect(returnValue).toBe(builder);
    });
  });

  describe('withParameters()', () => {
    it('should set temperature when provided', () => {
      // Arrange
      const params: ModelParameters = { temperature: 0.7 };

      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('Test')
        .withParameters(params)
        .build();

      // Assert
      expect(result.temperature).toBe(0.7);
    });

    it('should set max_tokens when provided', () => {
      // Arrange
      const params: ModelParameters = { max_tokens: 1000 };

      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('Test')
        .withParameters(params)
        .build();

      // Assert
      expect(result.max_tokens).toBe(1000);
    });

    it('should set top_p when provided', () => {
      // Arrange
      const params: ModelParameters = { top_p: 0.9 };

      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('Test')
        .withParameters(params)
        .build();

      // Assert
      expect(result.top_p).toBe(0.9);
    });

    it('should set all parameters when all provided', () => {
      // Arrange
      const params: ModelParameters = {
        temperature: 0.8,
        max_tokens: 2000,
        top_p: 0.95,
      };

      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('Test')
        .withParameters(params)
        .build();

      // Assert
      expect(result.temperature).toBe(0.8);
      expect(result.max_tokens).toBe(2000);
      expect(result.top_p).toBe(0.95);
    });

    it('should only set provided parameters (undefined ignored)', () => {
      // Arrange
      const params: ModelParameters = {
        temperature: 0.5,
        // max_tokens and top_p undefined
      };

      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('Test')
        .withParameters(params)
        .build();

      // Assert
      expect(result.temperature).toBe(0.5);
      expect(result.max_tokens).toBeUndefined();
      expect(result.top_p).toBeUndefined();
    });

    it('should allow method chaining', () => {
      // Arrange
      const params: ModelParameters = { temperature: 0.7 };

      // Act
      const returnValue = builder.withParameters(params);

      // Assert
      expect(returnValue).toBe(builder);
    });
  });

  describe('build()', () => {
    it('should build valid request with all fields', () => {
      // Arrange
      const schema: ResponseSchema = {
        name: 'response',
        schema: { type: 'object' },
      };

      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withSystemMessage('System prompt')
        .withUserMessage('User message')
        .withResponseSchema(schema)
        .withParameters({ temperature: 0.7 })
        .build();

      // Assert
      expect(result).toMatchObject({
        model: 'openai/gpt-4o-mini',
        messages: expect.any(Array),
        response_format: expect.any(Object),
        temperature: 0.7,
      });
    });

    it('should throw error if model missing', () => {
      // Arrange
      builder.withUserMessage('Test message');

      // Act & Assert
      expect(() => builder.build()).toThrow('Model and messages are required');
    });

    it('should throw error if messages missing', () => {
      // Arrange
      builder.withModel('openai/gpt-4o-mini');

      // Act & Assert
      expect(() => builder.build()).toThrow('Model and messages are required');
    });

    it('should throw error if both model and messages missing', () => {
      // Act & Assert
      expect(() => builder.build()).toThrow('Model and messages are required');
    });

    it('should return complete request object', () => {
      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('Hello')
        .build();

      // Assert
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('messages');
      expect(result.model).toBeTruthy();
      expect(result.messages.length).toBeGreaterThan(0);
    });
  });

  describe('reset()', () => {
    it('should clear all fields', () => {
      // Arrange
      builder
        .withModel('openai/gpt-4o-mini')
        .withSystemMessage('System')
        .withUserMessage('User')
        .withParameters({ temperature: 0.7 });

      // Act
      builder.reset();

      // Assert
      expect(() => builder.build()).toThrow('Model and messages are required');
    });

    it('should allow reusing builder', () => {
      // Arrange
      const firstRequest = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('First message')
        .build();

      // Act
      builder.reset();
      const secondRequest = builder
        .withModel('anthropic/claude-3-5-sonnet')
        .withUserMessage('Second message')
        .build();

      // Assert
      expect(firstRequest.model).toBe('openai/gpt-4o-mini');
      expect(secondRequest.model).toBe('anthropic/claude-3-5-sonnet');
      expect(firstRequest.messages[0].content).toBe('First message');
      expect(secondRequest.messages[0].content).toBe('Second message');
    });

    it('should return this for method chaining', () => {
      // Act
      const returnValue = builder.reset();

      // Assert
      expect(returnValue).toBe(builder);
    });
  });

  describe('Integration scenarios', () => {
    it('should build complete request with all methods', () => {
      // Arrange
      const schema: ResponseSchema = {
        name: 'complete_response',
        schema: {
          type: 'object',
          properties: {
            result: { type: 'string' },
          },
        },
      };

      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withSystemMessage('You are a helpful assistant')
        .withUserMessage('Hello!')
        .withResponseSchema(schema)
        .withParameters({
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 0.9,
        })
        .build();

      // Assert
      expect(result.model).toBe('openai/gpt-4o-mini');
      expect(result.messages).toHaveLength(2);
      expect(result.response_format).toBeDefined();
      expect(result.temperature).toBe(0.7);
      expect(result.max_tokens).toBe(1000);
      expect(result.top_p).toBe(0.9);
    });

    it('should handle minimal request (only model and messages)', () => {
      // Act
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withUserMessage('Simple question')
        .build();

      // Assert
      expect(result.model).toBe('openai/gpt-4o-mini');
      expect(result.messages).toHaveLength(1);
      expect(result.response_format).toBeUndefined();
      expect(result.temperature).toBeUndefined();
    });

    it('should chain all methods fluently', () => {
      // Arrange
      const schema: ResponseSchema = {
        name: 'test',
        schema: { type: 'object' },
      };

      // Act - all in one chain
      const result = builder
        .withModel('openai/gpt-4o-mini')
        .withSystemMessage('System')
        .withUserMessage('User')
        .withResponseSchema(schema)
        .withParameters({ temperature: 0.5 })
        .build();

      // Assert
      expect(result).toBeDefined();
      expect(result.model).toBeTruthy();
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('should reuse builder after reset in realistic scenario', () => {
      // Scenario 1: Receipt processing
      const receiptSchema: ResponseSchema = {
        name: 'receipt',
        schema: { type: 'object', properties: { items: { type: 'array' } } },
      };

      const receiptRequest = builder
        .withModel('openai/gpt-4o-mini')
        .withSystemMessage('Extract receipt data')
        .withUserMessage('Process this receipt')
        .withResponseSchema(receiptSchema)
        .build();

      // Reset for Scenario 2: Text generation
      builder.reset();

      const textRequest = builder
        .withModel('anthropic/claude-3-5-sonnet')
        .withUserMessage('Write a story')
        .withParameters({ temperature: 0.9 })
        .build();

      // Assert - requests are independent
      expect(receiptRequest.model).toBe('openai/gpt-4o-mini');
      expect(receiptRequest.response_format).toBeDefined();
      expect(receiptRequest.temperature).toBeUndefined();

      expect(textRequest.model).toBe('anthropic/claude-3-5-sonnet');
      expect(textRequest.response_format).toBeUndefined();
      expect(textRequest.temperature).toBe(0.9);
    });
  });
});