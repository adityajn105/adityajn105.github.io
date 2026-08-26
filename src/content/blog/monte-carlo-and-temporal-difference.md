---
title: "Monte Carlo and Temporal Difference Learning"
description: "When the full MDP is unknown, an agent must learn from experience. This post covers Monte Carlo and Temporal Difference methods for model-free reinforcement learning."
pubDate: 2019-04-10
tags: ["Reinforcement Learning"]
disqusId: 4
---

Before we go ahead and start discussing Monte Carlo and Temporal Difference learning for policy optimization, I think you must have knowledge about policy optimization in a known environment, i.e. Value Iterations and Policy Iterations. My advice is to check out the below article to learn about Markov Decision Process, Value Iterations and Policy Iterations.

[Policy Optimization in Reinforcement Learning.](/blogs/policy-optimization-rl.html)

Policy Iterations and Value Iterations are algorithms based on dynamic programming which require knowledge of the complete MDP where all environment variables are known. Here the goal of the agent was to learn a policy. This problem is called Model-Based Learning.

But in real scenarios we do not have knowledge of the environment and we have to learn about the environment by experimenting or interacting with it. This problem is called Model Free Learning.

1. We will miss a transition model, so we don't know what's going to happen after each action we take beforehand.
2. We will also miss our reward function.

### Exploitation vs Exploration

This applies to systems that want to acquire new knowledge and maximize their reward at the same time. Example. Think of a slot machine in a casino. Each machine has its own probability of winning. As a player you want to make as much money as possible. Here's the dilemma. How do you figure out which of the machines have the best odds, while at the same time maximizing your profit? If you constantly played one of the machines you would never gain any knowledge about the odds of the other machines. Also if you always picked a machine at random you would learn a lot about the other machines but probably wouldn't make as much money as you could have by always playing the "best machine".

This applies to the principle of our choices in life. Do we try drastically different things to explore what makes us happy, or do we exploit our current situation and knowledge to make the best out of it? In today's society we are loosely based on what is called an epsilon-decreasing strategy. Epsilon decreases over time — we try to figure out what we want to do at a young age, and then stick with it throughout our lives. Is this strategy optimal, or is it imposed on us by society? In the slot machine example we wanted to make as much money as possible. This was the metric we tried to optimize. In the real life example, the metric is how much money we make, how much free time we have, how safe our family is.

Let's look at some strategies which can help us with this dilemma.

#### 1. Epsilon-decreasing with softmax

We exploit the current situation with the probability 1-epsilon and explore a new option with the probability epsilon, with epsilon decreasing over time. In case of exploring we don't want to just pick each option at random, instead we estimate the outcome of each option and then pick based on that (softmax part).

#### 2. Upper confidence bound strategy

We always pick the option with the highest possible outcome, even if that outcome is very unlikely. The intuition behind this strategy is that options with high uncertainty usually lead to a lot of new knowledge. We don't know enough about an option to accurately estimate the return, and by pursuing the option we are bound to learn more and improve our future estimation. In simulated settings this algorithm does well when we have many options with different variances.

#### 3. Contextual-Epsilon-greedy strategy

Similar to epsilon-greedy, but we choose the value of epsilon based on how critical our situation is. When we are in a critical situation (large debt, need to provide for a sick family) we always exploit instead of explore — we do what we know works well. If we are in a situation that is not critical we are more likely to explore new things. This strategy makes intuitive sense, but I believe it is not commonly followed. Even in non-critical situations we often choose to keep doing what we have always done due to our risk-averse nature.

#### 4. Optimistic Initialization

This is a simple and practical idea. Initialize everything as if everything is highly rewarding. We will assume that an action in a state is highly rewarding until proven otherwise. This method gives every state-action pair a chance to prove itself. But it could take a lot of time since we now need to try and explore every state-action pair to know its exact value.

#### 5. Optimism in the Face of Uncertainty

In this we will always pick the action which has a chance of being highly rewarding. Let's understand this with a simple example below.

![](/blogs/images/optimisim_in_the_face_of_certainity.png)

Here, what action should we pick? The more uncertain we are about an action's value, the more important it is to explore that action. It could turn out to be the best action. Here we will pick the blue action as it seems to be highly rewarding, whereas it seems very unlikely that the red action would be as good.

## Monte Carlo Methods

Monte Carlo methods are a large family of computational algorithms that rely on random sampling. These methods are mainly used for numerical integration, stochastic optimization, character distributions etc.

Monte Carlo vs Dynamic Programming:

1. No need of a complete Markov Decision Process.
2. Computationally more efficient.
3. Can be used with stochastic simulators.

In reinforcement learning, for an unknown MDP environment, or say Model Free Learning, Monte Carlo will learn directly from the episode of experience. MC uses the simplest possible idea: the value of a state-action pair is the mean of all returns.

- **Goal:** Learn $V_{\pi}$ from an episode of experience.
- **Return:** Return is the total discounted reward $G = R_{t+1} + \gamma R_{t+2} + .... + \gamma^{t-1}R_{T}$
- **Value Function:** Value function is the expected return $V_{\pi}(s) = E_{\pi} [ G_{t} | S_{t}=S ]$

**MC uses empirical mean return instead of expected return.**

There are 2 types of Monte Carlo Control Methods:

1. On-policy First Visit Monte Carlo Control: In each episode, we will consider only the first visit of every state-action pair to calculate the mean return.
2. On-policy Every Visit Monte Carlo Control: In each episode, we will consider every visit of every state-action pair to calculate the mean return.

Here we will discuss First Visit Monte Carlo Control only.

#### Algorithm for First Visit Monte Carlo Control:

- Initialize for all s $\in S$, a $\in A(s)$:
  - Q(s,a) $\leftarrow$ arbitrary
  - Visit(s,a) $\leftarrow$ 0
  - $\pi$(a|s) $\leftarrow$ an arbitrary $\epsilon$ soft policy
- Repeat Forever
  - Generate an episode using $\pi$
  - For each pair s,a appearing in the episode
    - G $\leftarrow$ the return that follows the first occurrence of s,a
    - Visit(s,a) $\leftarrow$ Visit(s,a) + 1
    - Q(s,a) $\leftarrow$ Q(s,a) + 1/Visit(s,a) (G - Q(s,a)) — this is the incremental mean
- For each S in the episode
  - $A^\ast \leftarrow argmax_a Q(s,a)$
  - For all $a \in A(s)$:

$$
\pi(a,s) = \left \{
  \begin{aligned}
  &\max(A^\ast(s,a)), && \text{if } \text{random} > \epsilon \\
  &\text{random}(A(s)), && \text{otherwise }
  \end{aligned} \right.
$$

#### Code for First Visit Monte Carlo Control to solve Frozen Lake OpenAI gym game:

```python
import numpy as np
import gym
import random
import time

game = gym.make('FrozenLake-v0')
env = game.env
policy_to_action = {0:'L',1:'D',2:'R',3:'U'}

GAMMA = 0.9
def epsilon_greedy(a,env,eps=0.1):
    p = np.random.random()
    if p < 1-eps:   #exploit
        return a
    else:           #explore
        return np.random.randint(0,env.nA)

def play_game(env,policy,EPSILON):
    s = env.reset()
    a = epsilon_greedy(policy[s],env,eps=EPSILON)
    
    #reward belong to one state and action before
    state_action_reward = [(s,a,0)]
    while True:
        s,r,terminated,_ = env.step(a)
        if terminated:
            state_action_reward.append((s,None,r))
            break
        else:
            a = epsilon_greedy(policy[s],env,eps=EPSILON)
            state_action_reward.append((s,a,r))
    G=0
    state_action_return = []
    first = True
    for s,a,r in reversed(state_action_reward):
        if first:
            first=False
        else:
            state_action_return.append((s,a,G))
            
        G = r + GAMMA*G
        state_action_return.reverse()
    return state_action_return
    
def monte_carlo(env,EPSILON=0.5,N_EPISODES=10000):
    policy = np.random.choice(env.nA,env.nS)
    Q = {}
    visit = {}
    for s in range(env.nS):
        Q[s] = {}
        visit[s] = {}
        for a in range(env.nA):
            Q[s][a] = 0
            visit[s][a] = 0
        
    deltas = [] #keep track of learning curve
    for i in range(N_EPISODES):
        # epsilon decreasing
        esp = max( 0, EPSILON - i/N_EPISODES )
        state_action_return = play_game(env,policy,esp)
        seen_state_action = set()
        biggest_change = 0
        for s,a,G in state_action_return:
            if (s,a) not in seen_state_action:
                visit[s][a] += 1
                oldq = Q[s][a]
                #incremental mean
                Q[s][a] = Q[s][a] + ( G - Q[s][a] )/visit[s][a]
                seen_state_action.add((s,a))
                biggest_change = max( biggest_change , np.abs(oldq - Q[s][a]) )
        deltas.append(biggest_change)
        
        #update policy
        for s in Q.keys():
            best_a = None
            best_G = float('-inf')
            for a,G in Q[s].items():
                if G > best_G:
                    best_G = G
                    best_a = a
            policy[s] = best_a
    V = []
    for s in Q.keys():
        best_G = float('-inf')
        for _,G in Q[s].items():
            if G > best_G:
                best_G = G
        V.append(best_G)
    return V,policy,deltas
    
start = time.time()
value,policy,Delta = monte_carlo(env,EPSILON=0.4,N_EPISODES=1000000)
print('TIME TAKEN {} seconds'.format(time.time()-start))
```

## Temporal Difference Learning

It is a combination of Monte Carlo Learning and Dynamic Programming. Just like Monte Carlo, Temporal Difference methods also learn directly from episodes of experience. But in contrast to Monte Carlo Learning, Temporal Difference learning will not wait till the end of the episode to update the expected future reward estimate (V) — it will wait only until the next time step to update value estimates.

In Monte Carlo:

$$ V(S_t) \leftarrow V(S_t) + \alpha \Big( G_t  - V(S_t) \Big) $$

In Temporal Difference:

$$ V(S_t) \leftarrow  V(S_t) + \alpha \Big( R_{t+1} + \gamma V(S_{t+1}) - V(S_t) \Big) $$

Where,

- $R_{t+1} + \gamma V(S_{t+1})$ is the estimated return, or TD target
- $\partial_t = R_{t+1} + \gamma V(S_{t+1}) - V(S_t)$ is called the TD error

Temporal Difference is generally more effective than Monte Carlo. It is more sensitive to initial value. Temporal Difference Control Learning has 2 algorithms:

1. SARSA (On policy TD control)
2. Q Learning (Off policy TD control)

Let's discuss On-policy learning and Off-policy learning before going into these algorithms.

- **On-policy Learning:** On policy learning method means it uses the same policy to choose the next action A'. Learn about the policy $\pi$ from the experience sampled from $\pi$.
- **Off-policy Learning:** Off policy learning method means it uses the target policy (greedy) to choose the best next action A' while following the behavior policy (epsilon-greedy).

### SARSA (state-action-reward-state-action)

$$ Q(S,A) \leftarrow Q(S,A) + \alpha \Big( R + \gamma Q(S',A') - Q(S,A) \Big) $$

The agent starts in state S, performs action A, gets reward R and goes to state S', and chooses action A' there and then updates the value of A' in S. Here TD target is $R + \gamma Q(S',A')$ and TD error is $R + \gamma Q(S',A') - Q(S,A)$

#### Algorithm for SARSA: An On-policy TD Control Algorithm

- Initialize $Q(s,a)$ $\forall s \in S, a \in A(S)$ arbitrarily, and $Q(\text{terminal}) = 0$
- Repeat (for each episode):
  - Initialize S
  - Choose A from S using policy derived from Q ($\epsilon$-greedy)
  - Repeat (for each step of episode)
    - Take action A, observe R, S'
    - Choose A' from S' using policy derived from Q ($\epsilon$-greedy).
    - $Q(S,A) \leftarrow Q(S,A) + \alpha [ R + \gamma Q(S',A') - Q(S,A) ]$
    - $S \leftarrow S', A \leftarrow A'$
  - Until S is terminated

### Q-Learning

One of the most important breakthroughs in reinforcement learning was the development of an off-policy TD control algorithm known as Q-learning. Q-learning estimates a state-action value function for a target policy that deterministically selects the action of highest value.

$$ Q(S,A) \leftarrow Q(S,A) + \alpha \Big( R + \gamma \max_{a'} Q(S',A') - Q(S,A) \Big) $$

Here, TD target is $R + \gamma \max_{a'} Q(S',A')$ and TD error is $R + \gamma \max_{a'} Q(S',A') - Q(S,A)$

**Why Q-Learning?**

1. Reuse experience generated from old policies $\pi_1, \pi_2, \pi_3, .....$
2. Learn about the optimal policy while following an exploratory policy.
3. Learn about multiple policies while following one policy.
4. Learn by observing humans or other agents.

#### Algorithm for Q-Learning: An Off-policy TD Control Algorithm

- Initialize $Q(s,a)$ $\forall s \in S, a \in A(S)$ arbitrarily, and $Q(\text{terminal}) = 0$
- Repeat (for each episode):
  - Initialize S
  - Choose A from S using policy derived from Q ($\epsilon$-greedy)
  - Repeat (for each step of episode)
    - Take action A, observe R, S'
    - $Q(S,A) \leftarrow Q(S,A) + \alpha [ R + \gamma \max_{a'} Q(S',A') - Q(S,A) ]$
    - $S \leftarrow S'$
  - Until S is terminated

#### Code for Q-Learning to solve Frozen-Lake OpenAI gym game:

```python
import numpy as np
import gym
import random
import time

game = gym.make('FrozenLake-v0')
env = game.env
policy_to_action = {0:'L',1:'D',2:'R',3:'U'}

ACTION_DIM = env.action_space.n
MAX_STEPS = env.spec.max_episode_steps
STATE_DIM = env.observation_space.n
NUM_EPISODES = 1000000
START_ALPHA = 0.1
ALPHA_TAPER = 0.01
START_EPSILON = 1
EPSILON_TAPER = 0.0001
GAMMA = 0.9

#initializing Q table
Q = np.zeros((STATE_DIM,ACTION_DIM),dtype=np.float64)
state_visits_count = {}
update_counts = np.zeros((STATE_DIM,ACTION_DIM),dtype=np.int64)
def updateQ( prev_state,action,reward,cur_state):
    alpha = START_ALPHA / ( 1 + update_counts[prev_state][action]*ALPHA_TAPER )
    update_counts[prev_state][action] += 1
    Q[prev_state][action] += alpha * ( reward + GAMMA * np.max(Q[cur_state]) - Q[prev_state][action] )
    
def epsilon_greedy(s,eps=START_EPSILON):
    if np.random.random() > 1-eps:
        return np.argmax(Q[s])
    else:
        return env.action_space.sample()
        
total_rewards = 0 
deltas = []
verbose = True

start = time.time()

for episode in tqdm(range(NUM_EPISODES),desc = "Progress : "):
    eps = START_EPSILON / ( 1.0 + EPSILON_TAPER * episode )
    if verbose and episode % (NUM_EPISODES/10) == 0:
        print("EPISODES : {} | AVG_REWARD : {} | EPSILON : {}".format(episode,total_rewards/(NUM_EPISODES/10),eps))
        total_rewards=0
    
    biggest_change = 0
    curr_state = env.reset()
    for _ in range(MAX_STEPS):
        action = epsilon_greedy(curr_state,eps=eps)
        state_visits_count[curr_state] = state_visits_count.get(curr_state,0)+1
        prev_state = curr_state
        curr_state, reward, done, _ = env.step(action)
        total_rewards += reward
        oldq = Q[prev_state][action]
        updateQ(prev_state,action,reward,curr_state)
        biggest_change = max( biggest_change , np.abs( oldq - Q[prev_state][action] ))
        if done:
            break
    deltas.append(biggest_change)

mean_state_visit = np.mean( list(state_visits_count.values()) )
print('EACH STATE WAS VISITED {} TIMES ON AN AVERAGE'.format( mean_state_visit ))

Value_F = np.zeros(STATE_DIM)
Policy_F = np.zeros(STATE_DIM)
for s in range(STATE_DIM):
    Value_F[s] = np.max(Q[s])
    Policy_F[s] = np.argmax(Q[s])

print("TIME TAKEN {} ".format(time.time()-start))
```

## What's Next?

In [next blog](/blogs/deep-q-learning.html), I am going to discuss the limitations of Q-Learning and come up with the solution to those limitations, which is Deep Q Learning. Also we will discuss some more advanced techniques to improve our Deep Q algorithm. Also we will build a reinforcement learning agent to play the flappy bird game.

## More Resources

1. [Model Free Reinforcement Learning Algorithm](https://medium.com/deep-math-machine-learning-ai/ch-12-1-model-free-reinforcement-learning-algorithms-monte-carlo-sarsa-q-learning-65267cb8d1b4)
2. [RL Course of David Silver - Lecture](https://www.youtube.com/watch?v=2pWv7GOvuf0&list=PL7-jPKtc4r78-wCZcQn5IqyuWhBZ8fOxT)
3. [Reinforcement Learning: An Introduction by Richard S. Sutton and Andrew G. Barto](http://web.stanford.edu/class/psych209/Readings/SuttonBartoIPRLBook2ndEd.pdf)
4. [Example codes and problems to understand concepts better.](https://github.com/adityajn105/Move37/tree/master/Classroom-Codes)
