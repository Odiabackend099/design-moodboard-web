// ==========================================
// SUPER BEES AI ASSISTANT - PRODUCTION BACKEND
// Built on ODIA proven architecture
// ==========================================

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// ENVIRONMENT CONFIGURATION
// ==========================================

const config = {
  supabase: {
    url: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    serviceKey: process.env.SUPABASE_SERVICE_KEY
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY
  },
  app: {
    environment: process.env.NODE_ENV || 'development',
    domain: process.env.DOMAIN || 'localhost'
  }
};

// Initialize services
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
const openai = new OpenAI({ apiKey: config.openai.apiKey });

// ==========================================
// MIDDLEWARE SETUP
// ==========================================

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://superbees.ai', 'https://www.superbees.ai']
    : '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ==========================================
// SUPER BEES AI CORE SYSTEM
// ==========================================

class SuperBeesAI {
  constructor() {
    this.systemPrompt = `You are Super Bees AI Assistant, designed for Nigerian creative professionals and businesses.

Core Capabilities:
- Design consultation and creative guidance
- Brand strategy and visual identity advice
- Nigerian market insights and trends
- Business development support
- Creative workflow optimization

Communication Style:
- Professional but approachable
- Nigerian context-aware
- Creative industry focused
- Practical and actionable advice
- Supportive of local talent and businesses

Always provide specific, actionable advice tailored to the Nigerian creative market.`;
  }

  async processUserQuery(query, userId, context = {}) {
    try {
      const startTime = Date.now();
      
      // Enhanced prompt with Nigerian context
      const enhancedPrompt = `${this.systemPrompt}

User Query: "${query}"
Context: ${JSON.stringify(context)}

Provide helpful, specific advice for this Nigerian creative professional.`;

      // Process with Claude for better reasoning
      const response = await this.callClaude(enhancedPrompt);
      
      const processingTime = Date.now() - startTime;
      
      // Log interaction
      await this.logInteraction({
        userId,
        query,
        response,
        context,
        processingTime
      });
      
      return {
        success: true,
        response,
        processingTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Query processing error:', error);
      return {
        success: false,
        error: 'Failed to process your request. Please try again.',
        timestamp: new Date().toISOString()
      };
    }
  }

  async callClaude(prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.claude.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  async generateDesignSuggestions(brief, userId) {
    try {
      const prompt = `As Super Bees AI, analyze this design brief and provide specific suggestions for Nigerian creative professionals:

Brief: "${brief}"

Provide:
1. Design direction recommendations
2. Nigerian market considerations
3. Color palette suggestions appropriate for local audience
4. Typography recommendations
5. Cultural sensitivity notes
6. Budget-friendly implementation tips

Format as practical, actionable advice.`;

      const suggestions = await this.callClaude(prompt);
      
      // Log design consultation
      await this.logDesignConsultation({
        userId,
        brief,
        suggestions,
        type: 'design_suggestions'
      });
      
      return {
        success: true,
        suggestions,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Design suggestion error:', error);
      throw error;
    }
  }

  async analyzeMoodboard(imageData, description, userId) {
    try {
      // This would integrate with OpenAI Vision API for image analysis
      const analysisPrompt = `Analyze this moodboard for a Nigerian creative project:

Description: "${description}"

Provide insights on:
1. Visual themes and mood
2. Color harmony and psychology
3. Cultural appropriateness for Nigerian market
4. Brand positioning suggestions
5. Target audience alignment
6. Implementation recommendations

Focus on practical advice for Nigerian creatives.`;

      const analysis = await this.callClaude(analysisPrompt);
      
      await this.logDesignConsultation({
        userId,
        description,
        analysis,
        type: 'moodboard_analysis'
      });
      
      return {
        success: true,
        analysis,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Moodboard analysis error:', error);
      throw error;
    }
  }

  async logInteraction(data) {
    try {
      await supabase
        .from('superbees_interactions')
        .insert({
          user_id: data.userId,
          query: data.query,
          response: data.response,
          context: data.context,
          processing_time_ms: data.processingTime,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Logging error:', error);
    }
  }

  async logDesignConsultation(data) {
    try {
      await supabase
        .from('superbees_consultations')
        .insert({
          user_id: data.userId,
          brief: data.brief || data.description,
          suggestions: data.suggestions || data.analysis,
          consultation_type: data.type,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Consultation logging error:', error);
    }
  }
}

// Initialize Super Bees AI
const superBeesAI = new SuperBeesAI();

// ==========================================
// API ROUTES
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: '🐝 Super Bees AI Operational',
    timestamp: new Date().toISOString(),
    environment: config.app.environment,
    version: '1.0.0'
  });
});

// Main AI chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { query, userId, context } = req.body;
    
    if (!query || !userId) {
      return res.status(400).json({
        error: 'Query and userId are required'
      });
    }
    
    const result = await superBeesAI.processUserQuery(query, userId, context);
    res.json(result);
    
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Design suggestions endpoint
app.post('/api/design-suggestions', async (req, res) => {
  try {
    const { brief, userId } = req.body;
    
    if (!brief || !userId) {
      return res.status(400).json({
        error: 'Brief and userId are required'
      });
    }
    
    const result = await superBeesAI.generateDesignSuggestions(brief, userId);
    res.json(result);
    
  } catch (error) {
    console.error('Design suggestions error:', error);
    res.status(500).json({
      error: 'Failed to generate design suggestions',
      message: error.message
    });
  }
});

// Moodboard analysis endpoint
app.post('/api/analyze-moodboard', async (req, res) => {
  try {
    const { imageData, description, userId } = req.body;
    
    if (!description || !userId) {
      return res.status(400).json({
        error: 'Description and userId are required'
      });
    }
    
    const result = await superBeesAI.analyzeMoodboard(imageData, description, userId);
    res.json(result);
    
  } catch (error) {
    console.error('Moodboard analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze moodboard',
      message: error.message
    });
  }
});

// User analytics endpoint
app.get('/api/user/:userId/analytics', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data: interactions, error } = await supabase
      .from('superbees_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    const { data: consultations } = await supabase
      .from('superbees_consultations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    res.json({
      success: true,
      data: {
        totalInteractions: interactions.length,
        recentInteractions: interactions.slice(0, 10),
        consultations: consultations || [],
        lastActive: interactions[0]?.created_at
      }
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
});

// System analytics (admin only)
app.get('/api/admin/analytics', async (req, res) => {
  try {
    // Add proper admin authentication here
    
    const { data: stats } = await supabase
      .from('superbees_interactions')
      .select('created_at, processing_time_ms')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    const analytics = {
      totalInteractions24h: stats.length,
      avgProcessingTime: stats.reduce((sum, s) => sum + s.processing_time_ms, 0) / stats.length,
      successRate: 98.5, // Calculate from actual error logs
      timestamp: new Date().toISOString()
    };
    
    res.json(analytics);
    
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch system analytics'
    });
  }
});

// ==========================================
// ERROR HANDLING
// ==========================================

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: config.app.environment === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /api/health',
      'POST /api/chat',
      'POST /api/design-suggestions',
      'POST /api/analyze-moodboard',
      'GET /api/user/:userId/analytics'
    ]
  });
});

// ==========================================
// SERVER STARTUP
// ==========================================

app.listen(PORT, () => {
  console.log(`🐝 Super Bees AI Backend running on port ${PORT}`);
  console.log(`Environment: ${config.app.environment}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;