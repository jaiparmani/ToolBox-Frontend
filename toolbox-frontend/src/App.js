import logo from './logo.svg';
import './App.css';
import Router from './components/Router.jsx';
import DashboardLayoutBasic from './components/DashboardLayout';
function App() {
  return (
    <div className="App">
      <DashboardLayoutBasic />
      <Router/>
    </div>
  );
}

export default App;
