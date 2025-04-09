import React from 'react';
import { HashRouter as Router, Route, Routes } from "react-router-dom";
import { Theme } from '@carbon/react';
import EvaluationReport from './components/evaluation-report/EvaluationReport';
import Navigation from './components/layout/navigation/Navigation';
import MainHeader from './components/layout/main-header/MainHeader';
import Dashboard from "./components/layout/dashboard/Dashboard";
import Leaderboard from './components/evaluation-metrics/EvaluationMetrics';
import EvaluationComparison from './components/evaluation-comparison/EvaluationComparison';

const App: React.FC = () => {
  return (
      <Theme theme="g100">
        <div className="app">
          <Router>
            <Navigation>
              <MainHeader />
            </Navigation>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/summary" element={<EvaluationReport />} />
              <Route path='/leaderboard' element={<Leaderboard />} />
              <Route path='/model-comparison' element={<EvaluationComparison />} />
            </Routes>
          </Router>
        </div>
      </Theme>
  );
};

export default App;
