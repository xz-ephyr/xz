import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatPage } from '../src/pages/ChatPage';
import * as aiService from '../src/services/aiService';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock the AI service
vi.mock('../src/services/aiService', () => ({
  getChatStream: vi.fn(),
}));

describe('ChatPage Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Mock window.alert
    vi.stubGlobal('alert', vi.fn());
  });

  it('should send a request with the selected model from localStorage', async () => {
    const apiKey = 'test-api-key';
    const selectedModel = 'gemini-1.5-flash';
    localStorage.setItem('api-key', apiKey);
    localStorage.setItem('selected-model', selectedModel);

    const mockStream = (async function* () {
      yield 'Hello';
      yield ' world';
    })();
    vi.mocked(aiService.getChatStream).mockResolvedValue(mockStream as any);

    render(
      <MemoryRouter initialEntries={['/chat/test-uuid']}>
        <Routes>
          <Route path="/chat/:uuid" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>
    );

    const inputs = screen.getAllByPlaceholderText('Ask anything...');
    const input = inputs[inputs.length - 1];
    fireEvent.change(input, { target: { value: 'Hi' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(aiService.getChatStream).toHaveBeenCalledWith(
        expect.arrayContaining([{ role: 'user', content: 'Hi' }]),
        apiKey,
        selectedModel
      );
    });

    expect(await screen.findByText('Hello world')).toBeDefined();
  });

  it('should show an error if API key is missing', async () => {
    render(
      <MemoryRouter initialEntries={['/chat/test-uuid']}>
        <Routes>
          <Route path="/chat/:uuid" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>
    );

    const inputs = screen.getAllByPlaceholderText('Ask anything...');
    const input = inputs[inputs.length - 1];
    fireEvent.change(input, { target: { value: 'Hi' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(window.alert).toHaveBeenCalledWith('Please set your Google API Key in settings.');
  });
});
