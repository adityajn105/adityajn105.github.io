---
title: "Policy Optimization in a Known MDP"
description: "When the MDP is fully known, an agent can compute an optimal policy directly. This post walks through policy iteration, value iteration, and related dynamic-programming techniques."
pubDate: 2018-10-19
tags: ["Reinforcement Learning"]
disqusId: 3
---

Before we go ahead and start discussing about policy optimization methods in Reinforcement Learning. Let me first clear few terms such as markov decision process, bellman equation, states, actions, rewards, policy, value functions etc. So lets understand them one by one.

In Reinforcement Learning, An AI agent learn how to optimally interact in a Real Time environment using Time-Delayed Labels called as Rewards as a signal. **Markov Decision Process** is a mathematical framework for defining the reinforcement learning problem using STATES, ACTIONS, REWARDS. Through interacting with an environment, an AI will learn a policy which will return an action for a given STATE with the highest reward.

### Markov Decision Process(MDP)

Reinforcement Learning problems are mathematically described using framework called Markov Decision Process(MDP). MDP are extended version of Markov Chain which adds decision and rewards to it. Markov indicates 'Markovian Property' means future state is independent of any previous state history given current state and action. Current state contains all that is needed to decide the future state when input action is given. This simplifies things a lot. Example "In a game of Chess".

MDP is an approach in achieving reinforcement learing to take decisions in a matrix. A grid would consist of states in form of grid. MDP tries to capture world in form of grid by dividing it into states, actions, transition matrix and rewards. The solution of MDP is policy and objective is to find optimal policy for task that MDP is imposed. Thus any reinforcement learning task is composed of set of states, actions and rewards that follow markov property is considered as MDP.

**State:** A set of tokens that represent every condition that agent can be in. **Model:** model or transition model gives an action's effect in state. In particular $T(s,a,s')$ defines transition T where being in state S, taking action 'a' takes us to state 's'. For stochastic actions (noisy, non-deterministic) we define probabiliity $P(S'|S,a)$ which represent probability of reaching S' if action 'a' is taken in state S. **Action:** Action 'a' is set of all possible decision, a(s) defines set of action that can be taken in state S. **Reward:** It is a real-valued response to action. $R(s)$ indicate reward for being in state 's'. $R(s,a)$ is reward for being in state 's' and taking action 'a'. $R(s,a,s')$ indicates reward for being in state 's', taking action 'a' and ending up in state 's'. **Policy:** It is a solution to Markov Decision Process. It is set of actions that are taken by agent to reach goal. It indicates action 'a' to be taken which in state S. A policy is denoted as 'Pi' as $pi(s)$ -> $\infty$

$\pi^\ast$ is called optimal policy, which maximizes expected reward. Among all policy taken, optimal policy one that maximize the amount of reward received or expected to receive over a lifetime. For an MDP there's no end of lifetime and you have to decide end time. Policy is nothing but a guide telling which action to take for a given state. It is not a plan but uncovers the underlying plan of the environment by returning the actions to take for each state.

Markov Decision Process (MDP) is a tuple (S,A,T,r,γ).

![](/blogs/images/markov-decision-process.png)

- $S$: Set of Observations
- $A$: Set of Actions
- $T$: Transition Model
- $r$: Reward Model
- $\gamma$: Discount factor (between 0 & 1) represent relative importance between immediate and future reward.

### Bellman Equation

Bellman Equation, help us evaluate the expected reward relative to the advantage or disadvantage of each state.

Question that Bellman equation answers: Given a state I'm in, assuming I take the best possible action now and at each subsequent step, what long term reward can I expect. **OR** What is the value of the STATE?

Bellman equations are Dynamic Programming Equations. If you dont know about dynamic programming, it is better to clear your concepts about dynamic programming.

#### For Deterministic Environment

In Deterministic enviroment, an agent will follow what the command is given to it. There is no probability of following some other action.

$$ V(s) = max_a \Bigl( R(s,a) + \gamma V(s') \Bigl) $$

- $V$: Value of given state s
- $max_a$: Maximum for action a
- $R$: reward for action a in state s
- $\gamma$: discount factor (Gamma)
- $s$: Next state by choosing action a

#### For Stochastic Environment

In stochastic environment, an agent will not always follow what we tell it to do. There is always a probability of following your commands. For this we will have to modify our Bellman equation as follows:

$$ V(s) = max_a \Bigl( R(s,a) + \gamma \sum_{s'} P(s,a,s') V(s') \Bigl) $$

- $V$: Value of given state s
- $max_a$: Maximum for action a
- $R$: reward for action a in state s
- $\gamma$: discount factor (Gamma)
- $s'$: Next state by choosing action a

### Value Functions

It estimates "how good" a state is for an agent to be in. Equal to expected discounted reward per agent when starting from state 's' and successfully following policy $pi$ for an action. May also be referred as 'Value of policy.'

**Two types of value functions.**

1. **State-Value Functions**: Expected/Discounted reward when starting in state 's' and successfully following policy '$pi$' for an action. Denoted as $V(s) or V_\pi(s)$. How good is a state.
2. **Action-Value Function**: Action 'a' to state 's' and return a real value. Referred as Q-function. Denoted as $Q(s,a)$. How good is a state action pair for agent in environment.

Optimal value function is a value function of a state for an optimal policy $\pi^\ast$, which maximizes discounted reward. Among all value function, there exist a one higher value function for all states denoted by $V^\ast(s)$.

## Policy Optimization

Until now we have studied about Reinforcement Learning environment, and we have also learned what our goal is in that enviroment i.e. to find Optimal Policy or say to find optimal value function because one will lead to another. In this blog we will discuss policy optimization using planning by dynamic programming. Dynamic Programming assumes full knowledge of MDP. It is used for planning in a MDP.

**Here we will discuss, 2 methods:**

1. **Policy Iteration**: Policy Evaluation $+$ Policy Improvement and the two are expected iteratively until policy converges.
2. **Value Iteration**: Finding optimal value function $+$ one policy extraction. There is not repeat of the two because once the value function is optimal, then policy out of it should also be optimal.

### 1. Policy Iteration

**Problem**: Given a policy $pi$, Find the optimal policy $\pi^\ast$.

**Solution**:

- Evaluate the policy $pi$.

  $$ V_{\pi}(s) = E\Big[ R_{t+1} + \gamma R_{t+2} + .... | s_t = s \Big] $$

- Improve the policy by acting greedily with respect to $V_\pi$.

  $$ \pi^\ast = greedy\Big( V_{\pi} \Big) $$

![](/blogs/images/policy_iteration.png)

- **Policy evaluation** - Estimate $V_{pi}$, Iterative policy evaluation
- **Policy improvement** - Generate $\pi' \geq \pi$, Greedy policy improvement

**Lets discuss the Policy Evaluation**

- Iterative application of Bellman expectation backup.
- $V_1 -> V_2 -> V_3 -> .... -> V_{pi}$. Start with random value function and iteratively figure out new value function.
- Using Synchronous backups:
  - at each iteration k+1
  - For all state $s\inS$
  - Update $V_{k+1}(s)$ from $V_k(s')$ using bellman expectation equation.

    $$ V_{k+1}(s) = \sum_{a \in A} \pi(a|s)\Big( R_s^a + \gamma \sum_{s' \in S} P_{ss'}^a V_k(s') \Big) $$

    $$ V^{k+1} = R^{\pi} + \gamma P^{\pi}V^{k} $$

  - Where $s'$ is successor of state $s$.

**Lets discuss the Policy Improvement**

- Find the best policy from the value function obtained from policy evaluation using greedy method.
- This process of policy iteration always converges to $\pi^\ast$.

**Example:** Below is the example code for policy iteration for Frozen Lake environment using OpenAI gym library. Play with code and put doubts in comment section below.

```python
"""
Author : Aditya Jain
Contact: https://adityajn105.github.io
"""
import gym
import numpy as np
#create game
game = gym.make('FrozenLake-v0')

#get game env object
env = game.env
policy_to_action = {0:"L",1:"D",2:"R",3:"U"}

def policy_iterations(env,theta=1e-3, discount_factor=0.9):
    """
    Args:
        env = the game env
            env.P returns all and their corresponsing action
            env.nS returns total no of states
            env.nA return total no of actions
        theta =  stop iteration if change become less than theta
        discount_factor = Gamma value
    Returns: best_policy, value function
    """
    
    def policy_evaluation(policy,V,env=env,theta=theta,discount_factor=discount_factor):
        """Helper function that returns new value function corresponding to a policy"""
        while True:
            V_prev = V.copy()
            for s in range(env.nS):
                action = policy[s]
                V[s] = 0
                for (prob,next_state,reward,_) in env.P[s][action]:
                    V[s] += prob * (reward + discount_factor * V_prev[next_state] )
            if np.sum(np.fabs(V_prev-V)) < theta: break
        return V
        
    def policy_improvement(V,env=env,discount_factor=discount_factor):
        """Helper function that returns best policy corresponding to value function using greedy method"""
        npolicy = np.zeros(env.nS)
        for s in range(env.nS):
            A = dict()
            for a in env.P[s].keys():
                A[a] = 0
                for (prob,next_state,reward,_) in env.P[s][a]:
                    A[a] += prob * (reward + V[next_state]*discount_factor )
            best_action = 0
            best_value = float('-inf')
            for a,v in A.items():
                if best_value < v:
                    best_action = a
                    best_value = v   
            npolicy[s] = best_action
        return npolicy
    
    #initializing policy which says always move right
    policy = np.zeros(env.nS)+2
    
    #initializing V
    V = np.zeros(env.nS)
    
    #policy iterations
    while True:
        V = policy_evaluation(policy,V)
        npolicy = policy_improvement(V)
        change = False
        for _p,p in zip(npolicy,policy):
            if _p!=p: change=True;break
        
        if not change:
            break
        else:
            policy = npolicy
    return policy,V
   
policy, value = policy_iterations(env)
gpolicy = list(map(lambda a: policy_to_action[a],policy))
print("Optimal Policy :\n {} ".format(np.reshape(gpolicy,(4,4))))
print("Optimal Values :\n {}".format(np.reshape(value,(4,4))))

"""
Lets see our success rate
"""
games = 1000
won = 0
for _ in range(games):
    state = game.reset()
    while True:
        action = int(policy[state])
        (state,reward,is_done,_) = game.step(action)
        if is_done:
            if reward>0:
                won+=1
            game.close()
            break
            
print("Success Rate : {}".format(won/games))
```

### 2. Value Iteration

**Problem**: Find Optimal Policy $\pi^\ast$.

**Solution**: Iterative application of Bellman optimality backup.

- $V_1 -> V_2 -> V_3 -> .... -> V_ast$. Start with random value function and update values using bellman optimality equation.
- Using Synchronous backups:
  - at each iteration k+1
  - For all state $s\inS$
  - Update $V_{k+1}(s)$ from $V_k(s')$ using bellman optimality equation.

    $$ V_{k+1}(s) =  \max_{a \in A} \Big( R^a_s + \gamma \sum_{s' \in S} P^a_{ss'} V_k(s') \Big) $$

    $$ V_{k+1} = \max_{a \in A} \Big( R^a + \gamma P^aV_k \Big) $$

  - Where $s'$ is successor of state $s$.
- Unlike policy iteration, there is no explicit policy.
- Intermediate value functio may not correspond to any policy.
- After we finally get optimal value function, we will extract policy using greedy method from that value function. We have to do this only once because optimal value function always gives optimal policy.

**Example:** Below is the example code for value iteration for Frozen Lake environment using OpenAI gym library. Play with code and put doubts in comment section below.

```python
"""
Author : Aditya Jain
Contact: https://adityajn105.github.io
"""
import gym
import numpy as np
#create game
game = gym.make('FrozenLake-v0')

#get game env object
env = game.env
policy_to_action = {0:"L",1:"D",2:"R",3:"U"}

def value_iterations(env, theta = 0.00001, discount_factor = 0.9):
    """
    Args:
        env = the game env
            env.P returns all and their corresponsing action
            env.nS returns total no of states
            env.nA return total no of actions
        theta =  stop iteration if change become less than theta
        discount_factor = Gamma value
    Returns: best_policy, value function
    
    """
    def one_step_lookahead(s,V,env=env,discount_factor=discount_factor):
        """Helper Function to to best action and its value for a state"""
        A = dict()
        for a in env.P[s].keys():
            A[a] = 0
            for (action_prob,next_state,reward,is_done) in env.P[s][a]:
                A[a] += action_prob * ( reward + discount_factor*V[next_state] ) 
        
        best_action = 0
        best_value = float('-inf')
        for a,v in A.items():
            if v > best_value:
                best_value = v
                best_action = a
        return best_action,best_value
    
    #value optimization
    V = np.zeros(env.nS)
    while True:
        biggest_change=0
        for s in range(env.nS):
            _, new_v = one_step_lookahead(s,V)
            old_v = V[s]

            V[s] = new_v
            
            change = abs(old_v-new_v)
            if biggest_change < change:
                biggest_change = change
        
        if biggest_change< theta:
            break
    
    #policy extraction
    policy = np.zeros(env.nS)
    for s in range(env.nS):
        best_a,_ = one_step_lookahead(s,V)
        policy[s] = best_a
    return policy, V

policy, value = value_iterations(env)
gpolicy = list(map(lambda a: policy_to_action[a],policy))
print("Optimal Policy :\n {} ".format(np.reshape(gpolicy,(4,4))))
print("Optimal Values :\n {}".format(np.reshape(value,(4,4))))

"""
Lets see our success rate
"""
games = 1000
won = 0
for _ in range(games):
    state = game.reset()
    while True:
        action = int(policy[state])
        (state,reward,is_done,_) = game.step(action)
        if is_done:
            if reward>0:
                won+=1
            game.close()
            break
            
print("Success Rate : {}".format(won/games))
```

### Conclusions

| Problem | Bellman Equation | Algorithm |
| --- | --- | --- |
| Prediction | Bellman Expectation Equation | Iterative Policy Evaluation |
| Control | Bellman Expectation Equation + Greedy Policy Improvement | Policy Iteration |
| Control | Bellman Optimality Equation | Value Iteration |

- Algorithms are based on state-value function $V_\pi(s) or V_ast(s)$
- Complexity $O(mn^2 )$ per iteration, for m actions and n states
- Could also apply to action-value function $q_pi(s, a) or q^ast(s, a)$
- Complexity $O(m^2n^2 )$ per iteration

## More Resources

1. [RL Course of David Silver - PPT](http://www0.cs.ucl.ac.uk/staff/d.silver/web/Teaching_files/DP.pdf)
2. [RL Course of David Silver - Lecture](https://www.youtube.com/watch?v=Nd1-UUMVfz4)
3. [Bellman equation tutorial for reinforcement Learning](https://www.youtube.com/watch?v=aAkFtRxeP7c)
4. [Example codes and problems to understand policy optimization better.](https://github.com/adityajn105/Move37/tree/master/Classroom-Codes)
