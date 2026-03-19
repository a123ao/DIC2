from flask import Flask, render_template, request, jsonify
import random

app = Flask(__name__)

ACTIONS = {
    "up": (-1, 0),
    "down": (1, 0),
    "left": (0, -1),
    "right": (0, 1)
}

def is_valid(r, c, n, obstacles):
    return 0 <= r < n and 0 <= c < n and [r, c] not in obstacles

def evaluate_policy(n, start, end, obstacles, policy, gamma=1.0, theta=1e-4, max_iters=1000):
    V = [[0.0 for _ in range(n)] for _ in range(n)]
    iterations = 0
    
    while iterations < max_iters:
        delta = 0
        new_V = [[0.0 for _ in range(n)] for _ in range(n)]
        for r in range(n):
            for c in range(n):
                if [r, c] == end:
                    new_V[r][c] = 0.0
                    continue
                if [r, c] in obstacles:
                    new_V[r][c] = 0.0
                    continue
                
                a = policy[r][c]
                dr, dc = ACTIONS[a]
                nr, nc = r + dr, c + dc
                
                # Bumping into wall or obstacle
                if not is_valid(nr, nc, n, obstacles):
                    nr, nc = r, c
                
                # Reward is -1 for each step
                reward = -1
                
                new_V[r][c] = reward + gamma * V[nr][nc]
                delta = max(delta, abs(new_V[r][c] - V[r][c]))
                
        V = new_V
        if delta < theta:
            break
        iterations += 1
        
    return V

def value_iteration(n, start, end, obstacles, gamma=1.0, theta=1e-4, max_iters=1000):
    V = [[0.0 for _ in range(n)] for _ in range(n)]
    policy = [["up" for _ in range(n)] for _ in range(n)]
    
    iterations = 0
    while iterations < max_iters:
        delta = 0
        new_V = [[0.0 for _ in range(n)] for _ in range(n)]
        
        for r in range(n):
            for c in range(n):
                if [r, c] == end:
                    new_V[r][c] = 0.0
                    continue
                if [r, c] in obstacles:
                    new_V[r][c] = 0.0
                    continue
                
                max_v = float('-inf')
                for a_name, (dr, dc) in ACTIONS.items():
                    nr, nc = r + dr, c + dc
                    if not is_valid(nr, nc, n, obstacles):
                        nr, nc = r, c
                    
                    v = -1 + gamma * V[nr][nc]
                    if v > max_v:
                        max_v = v
                        
                new_V[r][c] = max_v
                delta = max(delta, abs(new_V[r][c] - V[r][c]))
                
        V = new_V
        if delta < theta:
            break
        iterations += 1
        
    # Extract optimal policy
    for r in range(n):
        for c in range(n):
            if [r, c] == end or [r, c] in obstacles:
                continue
            
            best_a = "up"
            max_v = float('-inf')
            
            for a_name, (dr, dc) in ACTIONS.items():
                nr, nc = r + dr, c + dc
                if not is_valid(nr, nc, n, obstacles):
                    nr, nc = r, c
                
                v = -1 + gamma * V[nr][nc]
                if v > max_v:
                    max_v = v
                    best_a = a_name
            policy[r][c] = best_a
            
    return V, policy

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/evaluate', methods=['POST'])
def evaluate():
    data = request.json
    n = data.get('n', 5)
    start = data.get('start')
    end = data.get('end')
    obstacles = data.get('obstacles', [])
    
    # Generate random policy
    policy = [["up" for _ in range(n)] for _ in range(n)]
    action_names = list(ACTIONS.keys())
    for r in range(n):
        for c in range(n):
            policy[r][c] = random.choice(action_names)
    
    V = evaluate_policy(n, start, end, obstacles, policy)
    
    return jsonify({
        "status": "success",
        "V": V,
        "policy": policy
    })

@app.route('/api/optimize', methods=['POST'])
def optimize():
    data = request.json
    n = data.get('n', 5)
    start = data.get('start')
    end = data.get('end')
    obstacles = data.get('obstacles', [])
    
    V, policy = value_iteration(n, start, end, obstacles)
    
    return jsonify({
        "status": "success",
        "V": V,
        "policy": policy
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
