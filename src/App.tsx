import { useEffect, useState } from 'react'
import { GameScreen } from './components/GameScreen/GameScreen'
import { ResultScreen } from './components/ResultScreen/ResultScreen'
import { RevealScreen } from './components/RevealScreen/RevealScreen'
import { SetupScreen } from './components/SetupScreen/SetupScreen'
import type { GameConfig, GameRound, GameStep } from './types/game'
import { createRound, loadSavedConfig, saveConfig } from './utils/game'
import './App.css'

function App() {
  const [step, setStep] = useState<GameStep>('setup')
  const [config, setConfig] = useState<GameConfig>(() => loadSavedConfig())
  const [round, setRound] = useState<GameRound | null>(null)

  useEffect(() => {
    saveConfig(config)
  }, [config])

  function startNewRound() {
    setRound(createRound(config))
    setStep('reveal')
  }

  function returnToSetup() {
    setRound(null)
    setStep('setup')
  }

  return (
    <div className="app-shell">
      {step === 'setup' ? (
        <SetupScreen
          config={config}
          onConfigChange={setConfig}
          onStart={startNewRound}
        />
      ) : null}

      {step === 'reveal' && round ? (
        <RevealScreen
          config={config}
          round={round}
          onStartRound={() => setStep('playing')}
        />
      ) : null}

      {step === 'playing' ? (
        <GameScreen config={config} onFinishRound={() => setStep('result')} />
      ) : null}

      {step === 'result' && round ? (
        <ResultScreen
          round={round}
          onPlayAgain={startNewRound}
          onNewConfig={returnToSetup}
        />
      ) : null}
    </div>
  )
}

export default App
