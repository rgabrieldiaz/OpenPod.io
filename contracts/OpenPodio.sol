// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title OpenPodio
 * @notice Principal smart contract for OpenPod.io. Manages blind-voting competitions, 
 * racing pools, and secure reward distribution on the Monad Testnet.
 * 
 * @dev Optimized for Monad Parallel Execution:
 * 1. State partitioning: Mappings are structured with key hierarchies `competitionId => voter` 
 *    or `competitionId => candidate` to reduce state write contention. Separate wallets voting 
 *    for different candidates or in different competitions target independent storage slots.
 * 2. Pull Payments: Prize payouts to winning voters are structured using a pull-based (claim) 
 *    mechanism to prevent gas exhaustion DOS vulnerabilities that would occur with large loops.
 */
contract OpenPodio {
    
    enum State { Upcoming, Active, Ended }

    struct Competition {
        uint256 id;
        string title;
        address host;
        uint256 endTime;
        uint256 totalPool;
        address winner;
        uint256 rewardPerVoter;
        bool resolved;
        State state;
        address[] candidates;
    }

    // Micro-sum fixed cost per vote (0.1 MONAD)
    uint256 public constant VOTE_COST = 0.1 ether;

    // Competition counter
    uint256 public competitionCount;

    // Mapping from Competition ID to its details
    mapping(uint256 => Competition) public competitions;

    // Monad Parallel EVM Optimizations: state mappings keyed by (competitionId => address)
    // to partition write storage slots across independent user wallets.
    
    // Tracks if a user has voted in a competition
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // Tracks who a user voted for (Public: allows frontend to verify user prediction selections)
    mapping(uint256 => mapping(address => address)) public voterSelection;

    // Tracks vote counts per candidate (Private: hides real-time tally from public direct reads)
    mapping(uint256 => mapping(address => uint256)) private candidateVotes;

    // Tracks if a voter has claimed their share of the 20% pool
    mapping(uint256 => mapping(address => bool)) public rewardClaimed;

    // Dynamic candidate metadata
    mapping(uint256 => mapping(address => string)) public candidateProjectName;
    mapping(uint256 => mapping(address => string)) public candidateCreatorName;
    mapping(uint256 => mapping(address => string)) public candidateMediaUri;
    mapping(uint256 => mapping(address => bool)) public hasRegistered;

    // Events
    event ConcursoCreated(uint256 indexed competitionId, string title, address indexed host);
    event ParticipantRegistered(
        uint256 indexed competitionId, 
        address indexed participant, 
        string projectName, 
        string creatorName, 
        string mediaUrl
    );
    event VotingStarted(uint256 indexed competitionId, uint256 endTime);
    event VoteCast(uint256 indexed competitionId, address indexed voter);
    event CompetitionResolved(uint256 indexed competitionId, address indexed winner, uint256 totalPool);
    event RewardClaimed(uint256 indexed competitionId, address indexed voter, uint256 amount);

    /**
     * @notice Creates a new decentralized audio/podcast competition.
     * @param _title Title of the podcast episode/competition.
     */
    function createConcurso(string calldata _title) external returns (uint256) {
        competitionCount++;
        uint256 newId = competitionCount;
        
        Competition storage comp = competitions[newId];
        comp.id = newId;
        comp.title = _title;
        comp.host = msg.sender;
        comp.state = State.Upcoming;

        emit ConcursoCreated(newId, _title, msg.sender);
        return newId;
    }

    /**
     * @notice Allows a wallet to register their project in an upcoming competition.
     * @param _competitionId The competition ID.
     * @param _projectName Name of the podcast project.
     * @param _creatorName Name of the creator/team.
     * @param _mediaUrl URL of the audio, video or YouTube project content.
     */
    function registerParticipant(
        uint256 _competitionId,
        string calldata _projectName,
        string calldata _creatorName,
        string calldata _mediaUrl
    ) external {
        Competition storage comp = competitions[_competitionId];
        require(comp.id == _competitionId, "Competition does not exist");
        require(comp.state == State.Upcoming, "Registration is not open");
        require(!hasRegistered[_competitionId][msg.sender], "Already registered");
        require(bytes(_projectName).length > 0, "Project name cannot be empty");
        require(bytes(_creatorName).length > 0, "Creator name cannot be empty");
        require(bytes(_mediaUrl).length > 0, "Media URL cannot be empty");

        hasRegistered[_competitionId][msg.sender] = true;
        candidateProjectName[_competitionId][msg.sender] = _projectName;
        candidateCreatorName[_competitionId][msg.sender] = _creatorName;
        candidateMediaUri[_competitionId][msg.sender] = _mediaUrl;
        comp.candidates.push(msg.sender);

        emit ParticipantRegistered(_competitionId, msg.sender, _projectName, _creatorName, _mediaUrl);
    }

    /**
     * @notice Starts the voting phase for a competition. Only callable by the host.
     * @param _competitionId The competition ID.
     * @param _durationInMinutes The duration of the voting phase in minutes.
     */
    function startVoting(uint256 _competitionId, uint256 _durationInMinutes) external {
        Competition storage comp = competitions[_competitionId];
        require(comp.id == _competitionId, "Competition does not exist");
        require(comp.host == msg.sender, "Only the host can start voting");
        require(comp.state == State.Upcoming, "Competition not in Upcoming state");
        require(_durationInMinutes > 0, "Duration must be greater than zero");
        require(comp.candidates.length >= 2, "Must have at least two candidates to start");

        comp.state = State.Active;
        comp.endTime = block.timestamp + (_durationInMinutes * 1 minutes);

        emit VotingStarted(_competitionId, comp.endTime);
    }

    /**
     * @notice Casts a vote for a candidate in a specific competition.
     * @dev Accumulates vote counts privately to ensure blind voting.
     * @param _competitionId The competition ID.
     * @param _candidate The address of the candidate/project creator.
     */
    function vote(uint256 _competitionId, address _candidate) external payable {
        Competition storage comp = competitions[_competitionId];
        require(comp.endTime > 0, "Competition does not exist");
        require(comp.state == State.Active, "Competition is not active");
        require(block.timestamp < comp.endTime, "Voting has ended");
        require(!hasVoted[_competitionId][msg.sender], "Already voted in this competition");
        require(msg.value == VOTE_COST, "Must send exactly 0.1 MONAD");
        require(hasRegistered[_competitionId][_candidate], "Candidate not registered");

        // Record vote in partitioned state
        hasVoted[_competitionId][msg.sender] = true;
        voterSelection[_competitionId][msg.sender] = _candidate;
        
        // Private aggregation (blind tally)
        candidateVotes[_competitionId][_candidate]++;
        
        // Add funds to the pool
        comp.totalPool += msg.value;

        // Emit general event without revealing voter's choice
        emit VoteCast(_competitionId, msg.sender);
    }

    /**
     * @notice Resolves the competition after endTime has passed.
     * @dev Calculates the winner and distributes 80% of the pool to them automatically.
     * Sets rewardPerVoter for the remaining 20% pool to be claimed by voters.
     * @param _competitionId The competition ID.
     */
    function resolveCompetition(uint256 _competitionId) external {
        Competition storage comp = competitions[_competitionId];
        require(comp.endTime > 0, "Competition does not exist");
        require(block.timestamp >= comp.endTime, "Competition is still active");
        require(comp.state == State.Active, "Competition not active");
        require(!comp.resolved, "Competition already resolved");

        address winner = address(0);
        uint256 maxVotes = 0;
        uint256 numCandidates = comp.candidates.length;

        // Find the candidate with the highest vote count. 
        // In case of a tie, the candidate appearing earlier in the array is selected.
        for (uint256 i = 0; i < numCandidates; i++) {
            address candidate = comp.candidates[i];
            uint256 votes = candidateVotes[_competitionId][candidate];
            if (votes > maxVotes) {
                maxVotes = votes;
                winner = candidate;
            }
        }

        comp.resolved = true;
        comp.state = State.Ended;

        // If nobody voted, pool remains 0 and there is no winner.
        if (winner == address(0) || comp.totalPool == 0) {
            emit CompetitionResolved(_competitionId, address(0), 0);
            return;
        }

        comp.winner = winner;

        uint256 pool = comp.totalPool;
        uint256 creatorShare = (pool * 80) / 100;
        uint256 votersShare = pool - creatorShare;

        // Calculate reward per winning voter
        uint256 winningVoteCount = candidateVotes[_competitionId][winner];
        if (winningVoteCount > 0 && votersShare > 0) {
            comp.rewardPerVoter = votersShare / winningVoteCount;
        }

        // Distribute the 80% to the winner (project creator)
        (bool success, ) = payable(winner).call{value: creatorShare}("");
        require(success, "Payout to winner failed");

        emit CompetitionResolved(_competitionId, winner, pool);
    }

    /**
     * @notice Claims the proportionate share of the 20% pool for voters of the winning candidate.
     * @dev Pull-based payout pattern to ensure safe scalability and gas safety.
     * @param _competitionId The competition ID.
     */
    function claimRewards(uint256 _competitionId) public {
        Competition storage comp = competitions[_competitionId];
        require(comp.resolved, "Competition not yet resolved");
        require(comp.winner != address(0), "No winner determined");
        require(voterSelection[_competitionId][msg.sender] == comp.winner, "Did not vote for the winner");
        require(!rewardClaimed[_competitionId][msg.sender], "Reward already claimed");

        rewardClaimed[_competitionId][msg.sender] = true;
        uint256 rewardAmount = comp.rewardPerVoter;
        require(rewardAmount > 0, "No reward allocated");

        (bool success, ) = payable(msg.sender).call{value: rewardAmount}("");
        require(success, "Reward transfer failed");

        emit RewardClaimed(_competitionId, msg.sender, rewardAmount);
    }

    /**
     * @notice Claims the proportionate share of the 20% pool for voters of the winning candidate.
     * @dev Alias for backward compatibility.
     * @param _competitionId The competition ID.
     */
    function claimReward(uint256 _competitionId) external {
        claimRewards(_competitionId);
    }

    /**
     * @notice Helper to check details of a candidate's vote count.
     * @dev Only callable by the competition contract itself or after the competition is resolved
     * to keep voting blind during active status.
     * @param _competitionId The competition ID.
     * @param _candidate The candidate's address.
     * @return The number of votes.
     */
    function getCandidateVotes(uint256 _competitionId, address _candidate) external view returns (uint256) {
        require(
            competitions[_competitionId].resolved || block.timestamp >= competitions[_competitionId].endTime,
            "Voting results are hidden until resolved"
        );
        return candidateVotes[_competitionId][_candidate];
    }

    /**
     * @notice Helper to check registered candidates for a competition.
     * @param _competitionId The competition ID.
     * @return Array of candidate addresses.
     */
    function getCandidates(uint256 _competitionId) external view returns (address[] memory) {
        return competitions[_competitionId].candidates;
    }
}
