import logo from './logo.svg';
import './App.css';
import Router from './components/Router';
import DashboardLayoutBasic from './components/DashboardLayout';
import { BrowserRouter, useNavigate } from 'react-router-dom';

function App() {
  
  return (
    <div className="App">
    <BrowserRouter>

    <DashboardLayoutBasic />

</BrowserRouter>

    </div>
  );
}

export default App;
