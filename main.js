const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActivityType, ButtonBuilder, ButtonStyle, ActionRowBuilder, SelectMenuBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel],
});

const ALLOWED_ROLES_TO_USE_COMMAND = ['1146866916837839046'];
const TICKET_CATEGORIES = {
    "access": "1146866918234521838",
    "support": "1146866918234521838",
    "partner": "1146866918234521838",
};

const ARCHIVE_CATEGORY_NAME = "PROJEKTLEITUNG";
const ARCHIVE_CHANNEL_NAME = "🔐│ticket-archiv";
const SERVER_TEAM_ROLE_ID = "1146866916837839046";
const TARGET_GUILD_ID = "1146866916825235596";

// Update the bot's activity with server member count
async function updateActivity() {
    const guild = bot.guilds.cache.get(TARGET_GUILD_ID);
    if (guild) {
        const memberCount = guild.memberCount;
        bot.user.setActivity(`${guild.name} - ${memberCount} Members`, { type: ActivityType.Watching });
    } else {
        console.log(`Server with ID ${TARGET_GUILD_ID} not found!`);
    }
    setTimeout(updateActivity, 60000);
}

// Bot ready event
bot.once('ready', () => {
    console.log(`Bot is online as ${bot.user.tag}`);
    updateActivity();
});

// Check if user has the allowed role
function hasAllowedRole(member) {
    return member.roles.cache.some(role => ALLOWED_ROLES_TO_USE_COMMAND.includes(role.id));
}

// Slash command for sending a ticket embed
bot.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'send_ticket_embed') {
        if (!hasAllowedRole(interaction.member)) {
            const embed = new EmbedBuilder()
                .setTitle("Permission Denied")
                .setDescription("You are not authorized to execute this command.")
                .setColor(0xFF0000);

            try {
                await interaction.user.send({ embeds: [embed] });
            } catch {
                await interaction.reply({ content: "You are not authorized and I couldn't send you a DM.", ephemeral: true });
            }
            return;
        }

        const guildName = interaction.guild.name;
        const embed = new EmbedBuilder()
            .setTitle(`${guildName} - Tickets`)
            .setDescription("Please choose a category to create a ticket.\nA moderator will assist you shortly.")
            .setColor(0x880007)
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
            .setImage("https://i.postimg.cc/hPTtmb9L/v6zop3p2sb32fidi77-1.png")
            .setFooter({ text: "Powered by Jonesyyy", iconURL: "https://cdn.discordapp.com/avatars/801011337274589234/a_6a0d9f2ec8a68573280eaa8b9f060c52.gif?size=1024" });

        const selectMenu = new SelectMenuBuilder()
            .setCustomId('ticket_category')
            .setPlaceholder('Choose a category')
            .addOptions(
                { label: 'Support', value: 'support', emoji: '🛠️', description: 'Receive help with problems' },
                { label: 'Access', value: 'access', emoji: '💰', description: 'Ask for access to the bot' },
                { label: 'Partner', value: 'partner', emoji: '👪', description: 'Submit a partnership request' }
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.reply({ embeds: [embed], components: [row] });
    }
});

// Handle ticket creation and interaction events
bot.on('interactionCreate', async interaction => {
    if (!interaction.isSelectMenu()) return;

    if (interaction.customId === 'ticket_category') {
        const category = interaction.values[0];
        const categoryId = TICKET_CATEGORIES[category];

        const ticketCategory = interaction.guild.channels.cache.get(categoryId) || await interaction.guild.channels.create({
            name: `new ticket - ${category}`,
            type: 'GUILD_CATEGORY'
        });

        const existingChannel = ticketCategory.children.cache.find(channel => channel.name === `ticket-${interaction.user.username}`);
        if (existingChannel) {
            await interaction.reply({ content: `You already have a ticket in this category: ${existingChannel}`, ephemeral: true });
            return;
        }

        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: 'GUILD_TEXT',
            parent: ticketCategory.id,
            permissionOverwrites: [
                { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: interaction.guild.me.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: SERVER_TEAM_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle("Welcome to your ticket!")
            .setDescription("A moderator will soon take care of your request.")
            .setColor(0x880007);

        const closeButton = new ButtonBuilder()
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setCustomId('close_ticket');

        const row = new ActionRowBuilder().addComponents(closeButton);

        await ticketChannel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
        await interaction.reply({ content: `Your ticket has been created: ${ticketChannel}`, ephemeral: true });
    }
});

bot.login(process.env.TOKEN);