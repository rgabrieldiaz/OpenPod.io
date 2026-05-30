// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../contracts/OpenPodio.sol";

contract OpenPodioTest is Test {
    OpenPodio public openPodio;
    
    address public alice = address(0x1111);
    address public bob = address(0x2222);
    address public charlie = address(0x3333);
    
    address public candidate1 = address(0x4444);
    address public candidate2 = address(0x5555);
    address public candidate3 = address(0x6666);

    address[] public candidates;
    string[] public candidateMediaUris;
    uint256 public compId = 1;
    uint256 public duration = 1 days;
    uint256 public endTime;

    function setUp() public {
        openPodio = new OpenPodio();
        
        candidates.push(candidate1);
        candidates.push(candidate2);
        candidates.push(candidate3);

        candidateMediaUris.push("ipfs://uri1");
        candidateMediaUris.push("ipfs://uri2");
        candidateMediaUris.push("ipfs://uri3");

        endTime = block.timestamp + duration;
        
        // Fund test accounts
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(charlie, 10 ether);
    }

    function test_CreateCompetition() public {
        openPodio.createCompetition(compId, "Podcast Battle #1", "ipfs://media-hash", duration / 1 minutes, candidates, candidateMediaUris);
        
        (
            uint256 id,
            string memory title,
            string memory mediaUri,
            uint256 compEndTime,
            uint256 totalPool,
            address winner,
            uint256 rewardPerVoter,
            bool resolved,
            OpenPodio.State state
        ) = openPodio.competitions(compId);

        assertEq(id, compId);
        assertEq(title, "Podcast Battle #1");
        assertEq(mediaUri, "ipfs://media-hash");
        assertEq(compEndTime, endTime);
        assertEq(totalPool, 0);
        assertEq(winner, address(0));
        assertEq(rewardPerVoter, 0);
        assertFalse(resolved);
        assertTrue(state == OpenPodio.State.Active);
    }

    function test_RevertCreateDuplicateId() public {
        openPodio.createCompetition(compId, "Podcast Battle #1", "ipfs://media-hash", duration / 1 minutes, candidates, candidateMediaUris);
        
        vm.expectRevert("Competition ID already exists");
        openPodio.createCompetition(compId, "Another Title", "ipfs://hash", (duration + 1 hours) / 1 minutes, candidates, candidateMediaUris);
    }

    function test_VoteValid() public {
        openPodio.createCompetition(compId, "Podcast Battle #1", "ipfs://media-hash", duration / 1 minutes, candidates, candidateMediaUris);
        
        vm.prank(alice);
        openPodio.vote{value: 0.1 ether}(compId, candidate1);

        assertTrue(openPodio.hasVoted(compId, alice));
        
        (,,,,uint256 totalPool,,,,) = openPodio.competitions(compId);
        assertEq(totalPool, 0.1 ether);
    }

    function test_RevertVoteDouble() public {
        openPodio.createCompetition(compId, "Podcast Battle #1", "ipfs://media-hash", duration / 1 minutes, candidates, candidateMediaUris);
        
        vm.startPrank(alice);
        openPodio.vote{value: 0.1 ether}(compId, candidate1);

        vm.expectRevert("Already voted in this competition");
        openPodio.vote{value: 0.1 ether}(compId, candidate2);
        vm.stopPrank();
    }

    function test_RevertVoteWrongValue() public {
        openPodio.createCompetition(compId, "Podcast Battle #1", "ipfs://media-hash", duration / 1 minutes, candidates, candidateMediaUris);
        
        vm.prank(alice);
        vm.expectRevert("Must send exactly 0.1 MONAD");
        openPodio.vote{value: 0.05 ether}(compId, candidate1);
    }

    function test_VoteResultsHiddenDuringVoting() public {
        openPodio.createCompetition(compId, "Podcast Battle #1", "ipfs://media-hash", duration / 1 minutes, candidates, candidateMediaUris);
        
        vm.prank(alice);
        openPodio.vote{value: 0.1 ether}(compId, candidate1);

        vm.expectRevert("Voting results are hidden until resolved");
        openPodio.getCandidateVotes(compId, candidate1);
    }

    function test_ResolveAndClaimDistribution() public {
        openPodio.createCompetition(compId, "Podcast Battle #1", "ipfs://media-hash", duration / 1 minutes, candidates, candidateMediaUris);
        
        // Alice & Bob vote for Candidate 1
        vm.prank(alice);
        openPodio.vote{value: 0.1 ether}(compId, candidate1);
        
        vm.prank(bob);
        openPodio.vote{value: 0.1 ether}(compId, candidate1);
        
        // Charlie votes for Candidate 2
        vm.prank(charlie);
        openPodio.vote{value: 0.1 ether}(compId, candidate2);

        // Advance block time beyond endTime
        vm.warp(endTime + 1);

        // Candidate 1 has 2 votes. Candidate 2 has 1 vote. Candidate 1 wins.
        // Total Pool = 0.3 ether.
        // Creator (Candidate 1) gets 80% = 0.24 ether.
        // Voters of winner (Alice & Bob) get 20% = 0.06 ether, split between 2 = 0.03 ether each.
        
        uint256 balanceBeforeCreator = candidate1.balance;
        
        openPodio.resolveCompetition(compId);
        
        (,,,,,address winner,uint256 rewardPerVoter,bool resolved, OpenPodio.State state) = openPodio.competitions(compId);
        
        assertTrue(resolved);
        assertTrue(state == OpenPodio.State.Ended);
        assertEq(winner, candidate1);
        assertEq(rewardPerVoter, 0.03 ether);
        assertEq(candidate1.balance - balanceBeforeCreator, 0.24 ether);

        // Alice claims reward using claimRewards
        uint256 balanceBeforeAlice = alice.balance;
        vm.prank(alice);
        openPodio.claimRewards(compId);
        assertEq(alice.balance - balanceBeforeAlice, 0.03 ether);
        assertTrue(openPodio.rewardClaimed(compId, alice));

        // Bob claims reward using compatibility wrapper claimReward
        uint256 balanceBeforeBob = bob.balance;
        vm.prank(bob);
        openPodio.claimReward(compId);
        assertEq(bob.balance - balanceBeforeBob, 0.03 ether);
        assertTrue(openPodio.rewardClaimed(compId, bob));

        // Charlie tries to claim reward but should fail since he voted for candidate 2
        vm.prank(charlie);
        vm.expectRevert("Did not vote for the winner");
        openPodio.claimRewards(compId);
    }
}
