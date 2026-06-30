import { describe, it, expect, beforeEach } from 'vitest';
import GeminiSymptomService from './GeminiSymptomService';

describe('GeminiSymptomService Schema Parsing', () => {
  let service: GeminiSymptomService;

  beforeEach(() => {
    service = new GeminiSymptomService('dummy-api-key');
  });

  const validResponseTemplate = {
    possibleConditions: [
      {
        name: 'Common Cold',
        probability: 0.8,
        description: 'A viral infection of your nose and throat (upper respiratory tract).'
      }
    ],
    urgencyLevel: 'low',
    recommendations: ['Rest', 'Hydration'],
    requiresAttention: false,
    disclaimer: 'Not medical advice.',
    diet: {
      recommendedFoods: ['Soup'],
      foodsToAvoid: ['Dairy'],
      hydration: 'Drink plenty of water'
    },
    medications: {
      recommended: ['Paracetamol'],
      supplements: ['Vitamin C'],
      precautions: 'Do not exceed dose'
    }
  };

  it('should successfully parse a well-formed Gemini response', () => {
    const processGeminiResponse = (service as any).processGeminiResponse.bind(service);
    
    const result = processGeminiResponse(validResponseTemplate, 'cough and runny nose');
    
    expect(result.possibleConditions).toHaveLength(1);
    expect(result.possibleConditions[0].probability).toBe(80); // 0.8 * 100
    expect(result.severity).toBe(1); // 'low' maps to 1
    expect(result.recommendations).toEqual(['Rest', 'Hydration']);
  });

  it('should throw an error if the response is completely empty or null', () => {
    const processGeminiResponse = (service as any).processGeminiResponse.bind(service);
    
    expect(() => processGeminiResponse(null, 'cough')).toThrowError('Symptom analysis returned an empty or malformed result.');
    expect(() => processGeminiResponse(undefined, 'cough')).toThrowError('Symptom analysis returned an empty or malformed result.');
  });

  it('should throw an error if possibleConditions is missing or empty', () => {
    const processGeminiResponse = (service as any).processGeminiResponse.bind(service);
    
    const invalidResponse = { ...validResponseTemplate, possibleConditions: [] };
    expect(() => processGeminiResponse(invalidResponse, 'cough')).toThrowError('Symptom analysis did not return any possible conditions.');

    const invalidResponse2 = { ...validResponseTemplate };
    delete (invalidResponse2 as any).possibleConditions;
    expect(() => processGeminiResponse(invalidResponse2, 'cough')).toThrowError('Symptom analysis did not return any possible conditions.');
  });

  it('should throw an error if a condition entry is incomplete', () => {
    const processGeminiResponse = (service as any).processGeminiResponse.bind(service);
    
    const invalidResponse = {
      ...validResponseTemplate,
      possibleConditions: [
        { name: 'Incomplete Condition', probability: 0.5 } // missing description
      ]
    };
    
    expect(() => processGeminiResponse(invalidResponse, 'cough')).toThrowError('Symptom analysis returned an incomplete condition entry.');
  });

  it('should normalize known urgency synonyms to severity levels', () => {
    const processGeminiResponse = (service as any).processGeminiResponse.bind(service);
    
    const severeResponse = { ...validResponseTemplate, urgencyLevel: 'severe' };
    const severeResult = processGeminiResponse(severeResponse, 'chest pain');
    expect(severeResult.severity).toBe(4); // emergency

    const moderateResponse = { ...validResponseTemplate, urgencyLevel: 'moderate' };
    const moderateResult = processGeminiResponse(moderateResponse, 'fever');
    expect(moderateResult.severity).toBe(2); // medium
  });

  it('should throw an error for unrecognized urgency levels', () => {
    const processGeminiResponse = (service as any).processGeminiResponse.bind(service);
    
    const unknownResponse = { ...validResponseTemplate, urgencyLevel: 'super-urgent' };
    
    expect(() => processGeminiResponse(unknownResponse, 'pain')).toThrowError(/Unable to assess urgency from the analysis/);
  });
});
