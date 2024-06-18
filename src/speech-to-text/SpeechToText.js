import React, { useState, useEffect, useRef } from 'react';
import { BsFillMicFill } from 'react-icons/bs';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import {
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Card,
  CardContent,
  Grid,
} from '@mui/material';

const SpeechToText = () => {
  const [transcript, setTranscript] = useState('');
  const [copied, setCopied] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isNoiseDetected, setIsNoiseDetected] = useState(false); // State for noise detection
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  const noiseThreshold = 0.3; // Adjust threshold based on noise levels

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const languagesResponse = await mockFetchLanguages();
        setLanguages(languagesResponse.languages);
      } catch (error) {
        console.error('Error fetching languages:', error);
      }
    };

    fetchLanguages();
  }, []);

  const mockFetchLanguages = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const languages = [
          { code: 'en-US', name: 'English (US)' },
          { code: 'es-ES', name: 'Spanish' },
          { code: 'fr-FR', name: 'French' },
          { code: 'de-DE', name: 'German' },
          { code: 'it-IT', name: 'Italian' },
          { code: 'te-IN', name: 'Telugu' },
        ];
        resolve({ languages });
      }, 1000);
    });
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser.');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = selectedLanguage;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript('');
      setIsNoiseDetected(false); // Reset noise detection flag
      console.log('Speech recognition started...');
      resetTimer();
    };

    recognition.onresult = (event) => {
      resetTimer();
      let interimTranscript = '';
      let isNoise = false;
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          setTranscript((prev) => prev + event.results[i][0].transcript + '. ');
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
        // Basic noise detection based on amplitude threshold
        const amplitude = event.results[i][0].confidence;
        if (amplitude < noiseThreshold) {
          isNoise = true;
        }
      }
      setIsNoiseDetected(isNoise);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      setIsRecording(false);
      console.log('Speech recognition ended.');
    };

    recognition.start();

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mediaRecorder = new MediaRecorder(stream);
      setMediaRecorder(mediaRecorder);

      mediaRecorder.ondataavailable = (event) => {
        setAudioChunks((prev) => [...prev, event.data]);
      };

      mediaRecorder.start();

      // Apply noise reduction function after mediaRecorder is initialized
      applyNoiseReduction(mediaRecorder);
    }).catch((error) => {
      console.error('Error accessing microphone:', error);
    });
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioUrl);
        audioRef.current.src = audioUrl;
      };
    }
  };

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(stopRecording, 3000); // Stop recording after 3 seconds of inactivity
  };

  const handleCopy = () => {
    setCopied(true);
    navigator.clipboard.writeText(transcript);
    setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

  const clearText = () => {
    setTranscript('');
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = 'recorded_audio.mp3';
    a.click();
    URL.revokeObjectURL(audioUrl);
  };

  const handleLanguageChange = (e) => {
    setSelectedLanguage(e.target.value);
  };

  const applyNoiseReduction = (mediaRecorder) => {
    if (mediaRecorder && mediaRecorder.stream) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(mediaRecorder.stream);

      // Example: Applying a basic low-pass filter for noise reduction
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3000; // Adjust frequency cutoff as needed
      source.connect(filter);

      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.8; // Adjust gain as needed
      filter.connect(gainNode);

      const destination = audioContext.createMediaStreamDestination();
      gainNode.connect(destination);

      mediaRecorder.stream = destination.stream;
    }
  };

  return (
    <Grid
      container
      spacing={0}
      direction="column"
      alignItems="center"
      justifyContent="center"
      style={{ minHeight: '100vh' }}
    >
      <Grid item xs={10} sm={8} md={6} lg={4}>
        <Card>
          <CardContent>
            <h2>Speech to Text Conversion</h2>

            <FormControl fullWidth variant="outlined" sx={{ marginBottom: 3 }}>
              <InputLabel id="languageSelectLabel">Select Language:</InputLabel>
              <Select
                labelId="languageSelectLabel"
                id="languageSelect"
                value={selectedLanguage}
                onChange={handleLanguageChange}
                label="Select Language"
              >
                {languages.map((language) => (
                  <MenuItem key={language.code} value={language.code}>
                    {language.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              onClick={isRecording ? stopRecording : startRecording}
              sx={{ backgroundColor: '#369', ':hover': { backgroundColor: '#258' } }}
              fullWidth
            >
              <BsFillMicFill size={20} /> {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>

            <FormControl fullWidth>
              <TextField
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Generated text will appear here..."
                aria-label="Generated text"
                multiline
                rows={6}
                sx={{ marginBottom: 2, marginTop: 2 }}
              />

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <CopyToClipboard text={transcript}>
                    <Button
                      variant="contained"
                      sx={{ backgroundColor: '#98c222' }}
                      onClick={handleCopy}
                      fullWidth
                    >
                      {copied ? 'Copied!' : 'Copy Text'}
                    </Button>
                  </CopyToClipboard>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="contained"
                    sx={{ backgroundColor: '#98c222' }}
                    onClick={clearText}
                    fullWidth
                  >
                    Clear Text
                  </Button>
                </Grid>
              </Grid>
            </FormControl>

            {audioUrl && (
              <Button
                variant="contained"
                color="success"
                onClick={handleDownload}
                sx={{ marginTop: 2 }}
                fullWidth
              >
                Download Audio
              </Button>
            )}

            {isNoiseDetected && (
              <p style={{ color: 'red', marginTop: 10 }}>Noise detected. Check your environment.</p>
            )}

            <audio ref={audioRef} style={{ display: 'none' }} />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default SpeechToText;