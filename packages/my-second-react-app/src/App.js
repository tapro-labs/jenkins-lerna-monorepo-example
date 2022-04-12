import { Greeting } from '@tapro-labs/shared-components';
import './App.css';

function App() {
  return (
    <div className="App">
        <header className="App-header">
            Welcome to my second react app
            <Greeting name="Second React App"/>
        </header>
    </div>
  );
}

export default App;
