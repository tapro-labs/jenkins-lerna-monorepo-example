import { Greeting } from '@tapro-labs/shared-components';
import './App.css';

function App() {
  return (
    <div className="App">
        <header className="App-header">
            Welcome to my third react app
            <Greeting name="Third React App" />
        </header>
    </div>
  );
}

export default App;
